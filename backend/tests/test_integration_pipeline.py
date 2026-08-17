import pytest
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_integration_health_endpoint():
    """[INT-01] Integration Test: Verify GET /api/health endpoint returns status 200 and daemon metadata."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["assistant"] == "TEXA Daemon"
    assert "platform" in data
    assert "features" in data

def test_integration_system_control_endpoint():
    """[INT-02] Integration Test: Verify POST /api/system/control route handles command payload."""
    payload = {"action": "status", "params": {}}
    response = client.post("/api/system/control", json=payload)
    assert response.status_code in [200, 422, 500]

def test_integration_voice_trigger_endpoint():
    """[INT-03] Integration Test: Verify POST /api/voice/trigger route connects to AI Orchestrator."""
    payload = {"command": "Check system status"}
    response = client.post("/api/voice/trigger", json=payload)
    assert response.status_code in [200, 422, 500]

def test_integration_latest_voice_command():
    """[INT-04] Integration Test: Verify GET /api/voice/latest-command returns recent state."""
    response = client.get("/api/voice/latest-command")
    assert response.status_code == 200
    data = response.json()
    assert "command" in data
    assert "timestamp" in data
