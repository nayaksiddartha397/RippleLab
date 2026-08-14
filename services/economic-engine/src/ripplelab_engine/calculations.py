"""Deterministic loan and deposit primitives with auditable Decimal arithmetic."""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal, localcontext

DECIMAL_PRECISION = 50
MAX_ANNUAL_RATE_BPS = 10_000
MAX_TERM_MONTHS = 1_200
MAX_TERM_DAYS = 36_600
MONEY_ROUNDING = "nearest paise, ROUND_HALF_UP"

EMI_FORMULA_VERSION = "loan.emi.v1"
OUTSTANDING_BALANCE_FORMULA_VERSION = "loan.outstanding_balance.v1"
RATE_PASS_THROUGH_FORMULA_VERSION = "rates.linear_pass_through.v1"
FLOATING_RATE_RESET_FORMULA_VERSION = "loan.floating_rate_reset.v1"
DEPOSIT_INTEREST_FORMULA_VERSION = "deposit.simple_interest.v1"

_ONE = Decimal(1)
_MONEY_QUANTUM = Decimal("1")
_RATE_QUANTUM = Decimal("0.0001")
_BPS_DENOMINATOR = Decimal(10_000)
_MONTHLY_BPS_DENOMINATOR = Decimal(120_000)


@dataclass(frozen=True, slots=True)
class EmiResult:
    """Monthly payment for a fully amortizing fixed-rate loan."""

    monthly_payment_paise: int
    formula_version: str
    assumptions: tuple[str, ...]
    rounding: str = MONEY_ROUNDING


@dataclass(frozen=True, slots=True)
class OutstandingBalanceResult:
    """Principal remaining after scheduled payments."""

    outstanding_balance_paise: int
    scheduled_payment_paise: int
    formula_version: str
    assumptions: tuple[str, ...]
    rounding: str = MONEY_ROUNDING


@dataclass(frozen=True, slots=True)
class RatePassThroughResult:
    """Reference-rate shock after a linear transmission assumption."""

    applied_change_bps: Decimal
    formula_version: str
    assumptions: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class FloatingRateResetResult:
    """Repriced floating-rate loan with its before/after payment impact."""

    applied_rate_change_bps: Decimal
    resulting_annual_rate_bps: Decimal
    original_monthly_payment_paise: int
    reset_monthly_payment_paise: int
    monthly_payment_change_paise: int
    formula_version: str
    assumptions: tuple[str, ...]
    rounding: str = MONEY_ROUNDING


@dataclass(frozen=True, slots=True)
class DepositInterestResult:
    """Gross simple interest and maturity value for a deposit term."""

    gross_interest_paise: int
    maturity_value_paise: int
    formula_version: str
    assumptions: tuple[str, ...]
    rounding: str = MONEY_ROUNDING


def calculate_emi(
    principal_paise: int,
    annual_rate_bps: int,
    term_months: int,
) -> EmiResult:
    """Calculate the equal monthly instalment for a fully amortizing loan."""

    _validate_money("principal_paise", principal_paise)
    _validate_rate("annual_rate_bps", annual_rate_bps)
    _validate_positive_int("term_months", term_months, maximum=MAX_TERM_MONTHS)

    payment = _emi_decimal(Decimal(principal_paise), Decimal(annual_rate_bps), term_months)
    return EmiResult(
        monthly_payment_paise=_round_money(payment),
        formula_version=EMI_FORMULA_VERSION,
        assumptions=(
            "Fully amortizing loan with equal end-of-month payments.",
            "Nominal annual rate is divided by 12; fees, insurance, taxes and "
            "prepayments are excluded.",
            "The interest rate and term remain unchanged for this calculation.",
        ),
    )


def calculate_outstanding_balance(
    principal_paise: int,
    annual_rate_bps: int,
    term_months: int,
    payments_made: int,
) -> OutstandingBalanceResult:
    """Calculate scheduled principal remaining after ``payments_made`` instalments."""

    _validate_money("principal_paise", principal_paise)
    _validate_rate("annual_rate_bps", annual_rate_bps)
    _validate_positive_int("term_months", term_months, maximum=MAX_TERM_MONTHS)
    _validate_int("payments_made", payments_made)
    if payments_made < 0 or payments_made > term_months:
        raise ValueError("payments_made must be between 0 and term_months")

    principal = Decimal(principal_paise)
    annual_rate = Decimal(annual_rate_bps)
    payment = _emi_decimal(principal, annual_rate, term_months)

    if payments_made == 0:
        balance = principal
    elif payments_made == term_months or principal_paise == 0:
        balance = Decimal(0)
    elif annual_rate_bps == 0:
        balance = principal - (payment * payments_made)
    else:
        with localcontext() as context:
            context.prec = DECIMAL_PRECISION
            monthly_rate = annual_rate / _MONTHLY_BPS_DENOMINATOR
            growth = (_ONE + monthly_rate) ** payments_made
            balance = principal * growth - payment * ((growth - _ONE) / monthly_rate)

    return OutstandingBalanceResult(
        outstanding_balance_paise=_round_money(max(balance, Decimal(0))),
        scheduled_payment_paise=_round_money(payment),
        formula_version=OUTSTANDING_BALANCE_FORMULA_VERSION,
        assumptions=(
            "Every scheduled payment is made in full and on time at month end.",
            "The contractual payment is calculated without intermediate money rounding.",
            "Fees, prepayments, arrears and rate changes are excluded.",
        ),
    )


def calculate_rate_pass_through(
    reference_rate_change_bps: int,
    pass_through_ratio_bps: int,
) -> RatePassThroughResult:
    """Apply a 0-100% linear transmission ratio to a reference-rate shock."""

    _validate_int("reference_rate_change_bps", reference_rate_change_bps)
    if abs(reference_rate_change_bps) > MAX_ANNUAL_RATE_BPS:
        raise ValueError(
            "reference_rate_change_bps must be between "
            f"{-MAX_ANNUAL_RATE_BPS} and {MAX_ANNUAL_RATE_BPS}"
        )
    _validate_ratio("pass_through_ratio_bps", pass_through_ratio_bps)

    applied_change = (
        Decimal(reference_rate_change_bps) * Decimal(pass_through_ratio_bps) / _BPS_DENOMINATOR
    ).quantize(_RATE_QUANTUM)
    return RatePassThroughResult(
        applied_change_bps=applied_change,
        formula_version=RATE_PASS_THROUGH_FORMULA_VERSION,
        assumptions=(
            "Transmission is linear and contemporaneous.",
            "The pass-through ratio uses 10,000 basis points as 100%.",
            "No product-specific lag, floor or cap is applied by this primitive.",
        ),
    )


def calculate_floating_rate_reset(
    outstanding_principal_paise: int,
    current_annual_rate_bps: int,
    remaining_term_months: int,
    reference_rate_change_bps: int,
    pass_through_ratio_bps: int,
) -> FloatingRateResetResult:
    """Reprice a floating-rate loan while keeping its remaining term fixed."""

    _validate_money("outstanding_principal_paise", outstanding_principal_paise)
    _validate_rate("current_annual_rate_bps", current_annual_rate_bps)
    _validate_positive_int("remaining_term_months", remaining_term_months, maximum=MAX_TERM_MONTHS)
    transmission = calculate_rate_pass_through(reference_rate_change_bps, pass_through_ratio_bps)
    resulting_rate = (Decimal(current_annual_rate_bps) + transmission.applied_change_bps).quantize(
        _RATE_QUANTUM
    )
    if resulting_rate < 0 or resulting_rate > MAX_ANNUAL_RATE_BPS:
        raise ValueError(
            f"resulting annual rate must be between 0 and {MAX_ANNUAL_RATE_BPS} basis points"
        )

    principal = Decimal(outstanding_principal_paise)
    before = _round_money(
        _emi_decimal(principal, Decimal(current_annual_rate_bps), remaining_term_months)
    )
    after = _round_money(_emi_decimal(principal, resulting_rate, remaining_term_months))
    return FloatingRateResetResult(
        applied_rate_change_bps=transmission.applied_change_bps,
        resulting_annual_rate_bps=resulting_rate,
        original_monthly_payment_paise=before,
        reset_monthly_payment_paise=after,
        monthly_payment_change_paise=after - before,
        formula_version=FLOATING_RATE_RESET_FORMULA_VERSION,
        assumptions=(
            "The reference-rate shock is transmitted linearly using the selected "
            "pass-through ratio.",
            "The remaining loan term is fixed, so the monthly payment changes after reset.",
            "The reset happens once; future rate changes, fees, caps and reset lags are excluded.",
        ),
    )


def calculate_deposit_interest(
    principal_paise: int,
    annual_rate_bps: int,
    term_days: int = 365,
    day_count_basis: int = 365,
) -> DepositInterestResult:
    """Calculate gross simple deposit interest for an explicit day-count basis."""

    _validate_money("principal_paise", principal_paise)
    _validate_rate("annual_rate_bps", annual_rate_bps)
    _validate_int("term_days", term_days)
    if term_days < 0 or term_days > MAX_TERM_DAYS:
        raise ValueError(f"term_days must be between 0 and {MAX_TERM_DAYS}")
    _validate_int("day_count_basis", day_count_basis)
    if day_count_basis not in {360, 365, 366}:
        raise ValueError("day_count_basis must be one of 360, 365 or 366")

    with localcontext() as context:
        context.prec = DECIMAL_PRECISION
        interest = (
            Decimal(principal_paise)
            * Decimal(annual_rate_bps)
            / _BPS_DENOMINATOR
            * Decimal(term_days)
            / Decimal(day_count_basis)
        )
    rounded_interest = _round_money(interest)
    return DepositInterestResult(
        gross_interest_paise=rounded_interest,
        maturity_value_paise=principal_paise + rounded_interest,
        formula_version=DEPOSIT_INTEREST_FORMULA_VERSION,
        assumptions=(
            "Interest is simple, gross and paid at maturity.",
            f"The term uses {term_days}/{day_count_basis} of a year.",
            "Compounding, tax, penalties, early withdrawal and reinvestment are excluded.",
        ),
    )


def _emi_decimal(
    principal_paise: Decimal,
    annual_rate_bps: Decimal,
    term_months: int,
) -> Decimal:
    if principal_paise == 0:
        return Decimal(0)
    if annual_rate_bps == 0:
        return principal_paise / Decimal(term_months)
    with localcontext() as context:
        context.prec = DECIMAL_PRECISION
        monthly_rate = annual_rate_bps / _MONTHLY_BPS_DENOMINATOR
        growth = (_ONE + monthly_rate) ** term_months
        return principal_paise * monthly_rate * growth / (growth - _ONE)


def _round_money(value: Decimal) -> int:
    return int(value.quantize(_MONEY_QUANTUM, rounding=ROUND_HALF_UP))


def _validate_int(name: str, value: int) -> None:
    if isinstance(value, bool) or not isinstance(value, int):
        raise TypeError(f"{name} must be an integer")


def _validate_positive_int(name: str, value: int, *, maximum: int) -> None:
    _validate_int(name, value)
    if value <= 0 or value > maximum:
        raise ValueError(f"{name} must be between 1 and {maximum}")


def _validate_money(name: str, value: int) -> None:
    _validate_int(name, value)
    if value < 0:
        raise ValueError(f"{name} must not be negative")


def _validate_rate(name: str, value: int) -> None:
    _validate_int(name, value)
    if value < 0 or value > MAX_ANNUAL_RATE_BPS:
        raise ValueError(f"{name} must be between 0 and {MAX_ANNUAL_RATE_BPS}")


def _validate_ratio(name: str, value: int) -> None:
    _validate_int(name, value)
    if value < 0 or value > 10_000:
        raise ValueError(f"{name} must be between 0 and 10000")


__all__ = [
    "DEPOSIT_INTEREST_FORMULA_VERSION",
    "EMI_FORMULA_VERSION",
    "FLOATING_RATE_RESET_FORMULA_VERSION",
    "OUTSTANDING_BALANCE_FORMULA_VERSION",
    "RATE_PASS_THROUGH_FORMULA_VERSION",
    "DepositInterestResult",
    "EmiResult",
    "FloatingRateResetResult",
    "OutstandingBalanceResult",
    "RatePassThroughResult",
    "calculate_deposit_interest",
    "calculate_emi",
    "calculate_floating_rate_reset",
    "calculate_outstanding_balance",
    "calculate_rate_pass_through",
]
