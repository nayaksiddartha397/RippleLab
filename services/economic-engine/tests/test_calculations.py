from decimal import Decimal

import pytest

from ripplelab_engine.calculations import (
    DEPOSIT_INTEREST_FORMULA_VERSION,
    EMI_FORMULA_VERSION,
    FLOATING_RATE_RESET_FORMULA_VERSION,
    OUTSTANDING_BALANCE_FORMULA_VERSION,
    RATE_PASS_THROUGH_FORMULA_VERSION,
    calculate_deposit_interest,
    calculate_emi,
    calculate_floating_rate_reset,
    calculate_outstanding_balance,
    calculate_rate_pass_through,
)


def test_emi_matches_known_home_loan_example() -> None:
    result = calculate_emi(500_000_000, 850, 240)

    assert result.monthly_payment_paise == 4_339_116
    assert result.formula_version == EMI_FORMULA_VERSION
    assert result.rounding == "nearest paise, ROUND_HALF_UP"
    assert len(result.assumptions) == 3


def test_emi_handles_zero_rate_and_half_up_money_rounding() -> None:
    assert calculate_emi(100, 0, 8).monthly_payment_paise == 13
    assert calculate_emi(0, 850, 240).monthly_payment_paise == 0


@pytest.mark.parametrize(
    ("principal", "rate", "term", "error"),
    [
        (-1, 850, 240, ValueError),
        (100, -1, 240, ValueError),
        (100, 10_001, 240, ValueError),
        (100, 850, 0, ValueError),
        (100, 850, -1, ValueError),
        (True, 850, 240, TypeError),
    ],
)
def test_emi_rejects_invalid_inputs(principal: int, rate: int, term: int, error: type) -> None:
    with pytest.raises(error):
        calculate_emi(principal, rate, term)


def test_outstanding_balance_matches_known_amortization_point() -> None:
    result = calculate_outstanding_balance(500_000_000, 850, 240, 60)

    assert result.outstanding_balance_paise == 440_635_916
    assert result.scheduled_payment_paise == 4_339_116
    assert result.formula_version == OUTSTANDING_BALANCE_FORMULA_VERSION
    assert len(result.assumptions) == 3


def test_outstanding_balance_covers_start_maturity_and_zero_rate() -> None:
    assert calculate_outstanding_balance(120_000, 0, 12, 0).outstanding_balance_paise == 120_000
    assert calculate_outstanding_balance(120_000, 0, 12, 3).outstanding_balance_paise == 90_000
    assert calculate_outstanding_balance(120_000, 850, 12, 12).outstanding_balance_paise == 0


@pytest.mark.parametrize("payments", [-1, 13])
def test_outstanding_balance_rejects_invalid_payment_count(payments: int) -> None:
    with pytest.raises(ValueError, match="payments_made"):
        calculate_outstanding_balance(120_000, 850, 12, payments)


@pytest.mark.parametrize(
    ("shock", "ratio", "expected"),
    [
        (-100, 10_000, Decimal("-100.0000")),
        (-100, 7_000, Decimal("-70.0000")),
        (75, 3_333, Decimal("24.9975")),
        (75, 0, Decimal("0.0000")),
    ],
)
def test_rate_pass_through_is_linear_and_decimal_safe(
    shock: int, ratio: int, expected: Decimal
) -> None:
    result = calculate_rate_pass_through(shock, ratio)

    assert result.applied_change_bps == expected
    assert result.formula_version == RATE_PASS_THROUGH_FORMULA_VERSION
    assert len(result.assumptions) == 3


@pytest.mark.parametrize("ratio", [-1, 10_001])
def test_rate_pass_through_rejects_invalid_ratio(ratio: int) -> None:
    with pytest.raises(ValueError, match="pass_through_ratio_bps"):
        calculate_rate_pass_through(-100, ratio)


def test_floating_rate_reset_applies_partial_cut_and_reprices_emi() -> None:
    result = calculate_floating_rate_reset(
        outstanding_principal_paise=500_000_000,
        current_annual_rate_bps=850,
        remaining_term_months=240,
        reference_rate_change_bps=-100,
        pass_through_ratio_bps=7_000,
    )

    assert result.applied_rate_change_bps == Decimal("-70.0000")
    assert result.resulting_annual_rate_bps == Decimal("780.0000")
    assert result.original_monthly_payment_paise == 4_339_116
    assert result.reset_monthly_payment_paise == 4_120_180
    assert result.monthly_payment_change_paise == -218_936
    assert result.formula_version == FLOATING_RATE_RESET_FORMULA_VERSION
    assert len(result.assumptions) == 3


def test_floating_rate_reset_rejects_rate_below_zero() -> None:
    with pytest.raises(ValueError, match="resulting annual rate"):
        calculate_floating_rate_reset(100_000, 25, 12, -100, 10_000)


def test_deposit_interest_matches_one_year_simple_interest() -> None:
    result = calculate_deposit_interest(100_000_000, 725)

    assert result.gross_interest_paise == 7_250_000
    assert result.maturity_value_paise == 107_250_000
    assert result.formula_version == DEPOSIT_INTEREST_FORMULA_VERSION
    assert result.rounding == "nearest paise, ROUND_HALF_UP"
    assert len(result.assumptions) == 3


def test_deposit_interest_supports_explicit_term_and_day_count() -> None:
    result = calculate_deposit_interest(100_000, 500, term_days=180, day_count_basis=360)

    assert result.gross_interest_paise == 2_500
    assert result.maturity_value_paise == 102_500
    assert "180/360" in result.assumptions[1]


def test_deposit_interest_handles_zero_values() -> None:
    assert calculate_deposit_interest(0, 725).gross_interest_paise == 0
    assert calculate_deposit_interest(100_000, 0).gross_interest_paise == 0
    assert calculate_deposit_interest(100_000, 725, term_days=0).gross_interest_paise == 0


@pytest.mark.parametrize(
    ("principal", "rate", "days", "basis", "match"),
    [
        (-1, 725, 365, 365, "principal_paise"),
        (100_000, -1, 365, 365, "annual_rate_bps"),
        (100_000, 725, -1, 365, "term_days"),
        (100_000, 725, 365, 364, "day_count_basis"),
    ],
)
def test_deposit_interest_rejects_invalid_inputs(
    principal: int, rate: int, days: int, basis: int, match: str
) -> None:
    with pytest.raises(ValueError, match=match):
        calculate_deposit_interest(principal, rate, days, basis)
