import os
import json
import logging
from groq import Groq, APIError, RateLimitError
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Read API key from environment variable
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    logger.warning("GROQ_API_KEY environment variable is not set.")

# Initialize the Groq client
client = Groq(api_key=api_key)

def generate_news_insights(title: str) -> dict:
    """
    Generate financial insights (summary, why it matters, priority score) from a news headline
    using Groq's llama-3.3-70b-versatile model.
    """
    fallback_result = {
        "summary": "",
        "why_it_matters": "",
        "priority_score": 5
    }

    if not api_key:
        logger.error("Groq API key is missing. Returning fallback insights.")
        return fallback_result

    prompt = f"""Analyze the following financial news headline and return the analysis in JSON format.

Headline: {title}

The output must be a valid JSON object matching the following structure exactly:
{{
  "summary": "A 2-3 sentence summary explaining what this news is about, extrapolating logically from the headline.",
  "why_it_matters": "A clear explanation of why this news is significant for investors and financial markets.",
  "priority_score": <an integer between 1 and 10 representing the importance of this news to investors>
}}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a top-tier financial analyst. You must return only a valid JSON object with the keys: 'summary', 'why_it_matters', and 'priority_score'."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        content = response.choices[0].message.content
        if not content:
            logger.error("Groq API returned an empty response.")
            return fallback_result

        # Parse JSON output
        parsed_insights = json.loads(content)

        # Validate that the keys exist
        required_keys = ["summary", "why_it_matters", "priority_score"]
        for key in required_keys:
            if key not in parsed_insights:
                logger.error(f"Missing required key '{key}' in Groq response: {content}")
                return fallback_result

        # Ensure priority_score is an integer and within range
        try:
            score = int(parsed_insights["priority_score"])
            parsed_insights["priority_score"] = max(1, min(10, score))
        except (ValueError, TypeError):
            parsed_insights["priority_score"] = 5

        # Clean strings
        parsed_insights["summary"] = str(parsed_insights["summary"]).strip()
        parsed_insights["why_it_matters"] = str(parsed_insights["why_it_matters"]).strip()

        return parsed_insights

    except RateLimitError as e:
        logger.error(f"Groq API Rate Limit exceeded: {e}")
        return fallback_result
    except APIError as e:
        logger.error(f"Groq API Error: {e}")
        return fallback_result
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response from Groq: {e}")
        return fallback_result
    except Exception as e:
        logger.error(f"Unexpected error when calling Groq: {e}")
        return fallback_result
