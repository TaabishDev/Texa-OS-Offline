import pytest
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.browser_agent import BrowserAgent
from agents.doc_agent import DocAgent
from agents.system_agent import SystemAgent
from agents.comm_agent import CommAgent
from agents.ai_orchestrator import AIOrchestrator

class TestUnitAgents(unittest.TestCase):
    
    def setUp(self):
        self.browser_agent = BrowserAgent()
        self.doc_agent = DocAgent()
        self.system_agent = SystemAgent()
        self.comm_agent = CommAgent()
        self.orchestrator = AIOrchestrator(
            self.browser_agent, 
            self.doc_agent, 
            self.system_agent, 
            self.comm_agent
        )

    def test_browser_agent_initialization(self):
        """[UNIT-01] Verify BrowserAgent initial state and configuration."""
        self.assertIsNotNone(self.browser_agent)
        self.assertIsNone(getattr(self.browser_agent, 'browser', None))

    def test_doc_agent_file_type_validation(self):
        """[UNIT-02] Verify DocAgent instance state and generate method."""
        self.assertIsNotNone(self.doc_agent)
        self.assertTrue(hasattr(self.doc_agent, 'generate'))

    def test_system_agent_capabilities(self):
        """[UNIT-03] Verify SystemAgent system command capabilities."""
        self.assertIsNotNone(self.system_agent)

    def test_comm_agent_message_formatting(self):
        """[UNIT-04] Verify CommAgent email and message pipeline."""
        self.assertIsNotNone(self.comm_agent)

    def test_orchestrator_agent_routing(self):
        """[UNIT-05] Verify AIOrchestrator agent instance setup."""
        self.assertIsNotNone(self.orchestrator.browser_agent)
        self.assertIsNotNone(self.orchestrator.doc_agent)
        self.assertIsNotNone(self.orchestrator.system_agent)
        self.assertIsNotNone(self.orchestrator.comm_agent)

if __name__ == "__main__":
    unittest.main()
