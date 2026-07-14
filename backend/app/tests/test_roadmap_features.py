"""
Automated unit tests to verify the roadmap features:
- Episodic / Long-term Memory
- Prometheus Metrics & Observability
- Agentic Workflows & Tool Execution
"""

import os
import sys
import unittest
import asyncio
from unittest.mock import AsyncMock, patch

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.services.memory import get_user_profile, save_user_profile, extract_and_save_facts
from app.services.metrics import track_cache, track_llm_generation, get_prometheus_metrics
from app.services.agent import calculator_tool, extension_directory_tool, check_and_execute_agent_workflow


class TestRoadmapFeatures(unittest.TestCase):

    def setUp(self):
        # Clean up local DB if exists
        from app.services.memory import SQLITE_DB_PATH
        if os.path.exists(SQLITE_DB_PATH):
            try:
                os.remove(SQLITE_DB_PATH)
            except Exception:
                pass
        # Re-init SQLite schema
        from app.services.memory import init_local_db
        init_local_db()

    def test_long_term_memory(self):
        user_id = "test-user-123"
        
        # 1. Initially profile should be empty
        profile = get_user_profile(user_id)
        self.assertEqual(profile["facts"], [])
        self.assertEqual(profile["preferences"], {})
        
        # 2. Save profile and retrieve
        save_user_profile(user_id, {"farming_style": "organic"}, ["Grows tomatoes"])
        profile2 = get_user_profile(user_id)
        self.assertEqual(profile2["preferences"], {"farming_style": "organic"})
        self.assertEqual(profile2["facts"], ["Grows tomatoes"])

    def test_agent_calculator_tool(self):
        # Dilution percentage matching
        res = calculator_tool("Calculate a 2% concentration in 10 liters of water")
        self.assertIn("Calculation Result", res)
        self.assertIn("0.200 liters", res)
        self.assertIn("200.0 ml", res)
        
        # Expression matching
        res2 = calculator_tool("Calculate math expression 50 * 4")
        self.assertIn("50 * 4 = 200.000", res2)

    def test_agent_directory_tool(self):
        res = extension_directory_tool("I live in California. Where is my extension office?")
        self.assertIn("University of California Cooperative Extension", res)
        self.assertIn("ceinfo@ucanr.edu", res)
        
        res_default = extension_directory_tool("Where is the USDA expert?")
        self.assertIn("National USDA Extension Directory", res_default)

    def test_prometheus_metrics(self):
        # Reset and record metrics
        track_cache(True)
        track_cache(False)
        track_llm_generation(150, 2.5)
        
        metrics_text = get_prometheus_metrics()
        self.assertIn("llm_cache_hits_total 1", metrics_text)
        self.assertIn("llm_cache_misses_total 1", metrics_text)
        self.assertIn("llm_tokens_generated_total 150", metrics_text)
        self.assertIn("llm_generation_duration_seconds_sum 2.500000", metrics_text)

    @patch("app.services.agent.generate_completion", new_callable=AsyncMock)
    def test_check_and_execute_agent_workflow(self, mock_generate):
        mock_generate.return_value = "For a 2% concentration in 5 liters, use 100 ml."
        
        # Run async check
        loop = asyncio.get_event_loop()
        res = loop.run_until_complete(
            check_and_execute_agent_workflow("Please calculate dilution for 2% concentration in 5 liters")
        )
        self.assertIsNotNone(res)
        self.assertEqual(res, "For a 2% concentration in 5 liters, use 100 ml.")
        
        # Test non-matching query (should return None to bypass agent workflow)
        res_none = loop.run_until_complete(
            check_and_execute_agent_workflow("My tomato plant has yellow spots on leaves")
        )
        self.assertIsNone(res_none)


if __name__ == "__main__":
    unittest.main()
