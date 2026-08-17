import pytest
import os
import sys
import unittest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import VoiceTriggerRequest, NavigateRequest, SystemCommandRequest

class TestUnitHelpers(unittest.TestCase):

    def test_voice_trigger_request_valid_payload(self):
        """[UNIT-06] Verify VoiceTriggerRequest model validation with valid input."""
        req = VoiceTriggerRequest(command="open browser")
        self.assertEqual(req.command, "open browser")

    def test_navigate_request_defaults(self):
        """[UNIT-07] Verify NavigateRequest default values."""
        req = NavigateRequest(url="https://google.com")
        self.assertEqual(req.url, "https://google.com")
        self.assertFalse(req.headless)

    def test_system_command_request_optional_params(self):
        """[UNIT-08] Verify SystemCommandRequest handles optional params."""
        req = SystemCommandRequest(action="get_status")
        self.assertEqual(req.action, "get_status")
        self.assertIsNone(req.params)

    def test_environment_python_version(self):
        """[UNIT-09] Verify runtime python version compatibility."""
        self.assertTrue(sys.version_info >= (3, 10))

    def test_sys_platform_compatibility(self):
        """[UNIT-10] Verify OS platform identifier check."""
        self.assertIn(sys.platform, ["darwin", "linux", "win32"])

if __name__ == "__main__":
    unittest.main()
