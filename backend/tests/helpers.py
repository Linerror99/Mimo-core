"""Test helper functions for API tests."""


def get_error_message(response_json: dict) -> str:
    """
    Get error message from API response.

    Supports both old format ({"detail": "..."}) and new format ({"error": "..."}).

    Args:
        response_json: JSON response from API

    Returns:
        Error message string
    """
    return response_json.get("error") or response_json.get("detail", "")
