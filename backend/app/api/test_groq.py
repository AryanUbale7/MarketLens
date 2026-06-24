import os
import sys

# Ensure the parent directory is in sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.groq_service import generate_news_insights

def run_test():
    print("Testing generate_news_insights with Groq Service...")
    headline = "Reliance Industries reports 15% increase in net profit for Q1, beating estimates"
    print(f"Headline: '{headline}'")
    
    result = generate_news_insights(headline)
    print("\nResult:")
    import pprint
    pprint.pprint(result)
    
    # Assert result structure
    assert isinstance(result, dict), "Result must be a dictionary"
    assert "summary" in result, "Result must contain 'summary'"
    assert "why_it_matters" in result, "Result must contain 'why_it_matters'"
    assert "priority_score" in result, "Result must contain 'priority_score'"
    assert isinstance(result["priority_score"], int), "priority_score must be an integer"
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    run_test()