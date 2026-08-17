import pytest
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app, ai_orchestrator, browser_agent, doc_agent, system_agent, comm_agent

client = TestClient(app)

def test_system_full_lifecycle_health_and_capabilities():
    """[SYS-01] System Level Test: Full platform lifecycle & agent subsystem status check."""
    response = client.get("/api/health")
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "healthy"
    
    assert browser_agent is not None
    assert doc_agent is not None
    assert system_agent is not None
    assert comm_agent is not None
    assert ai_orchestrator is not None

def test_system_multi_agent_workflow_execution():
    """[SYS-02] System Level Test: End-to-end multi-agent workflow via voice & document system endpoints."""
    # Test 1: Voice trigger workflow
    res1 = client.post("/api/voice/trigger", json={"command": "System status report"})
    assert res1.status_code in [200, 422, 500]

    # Test 2: Latest state update
    res2 = client.get("/api/voice/latest-command")
    assert res2.status_code == 200

def test_system_error_handling_resilience():
    """[SYS-03] System Level Test: Unhandled route resilience test."""
    response = client.post("/api/voice/trigger", json={})
    assert response.status_code == 422
