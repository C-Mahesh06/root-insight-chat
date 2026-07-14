"""
Agentic Workflow and Tool Execution service.
Inspects user queries and executes tools (dilution calculator, agricultural directories) if needed.
"""

import re
from app.services.llm import generate_completion, build_messages
from app.utils.logger import get_logger

logger = get_logger("agent")


def calculator_tool(query: str) -> str:
    """
    Perform agricultural dilution and area/dosage calculations.
    """
    logger.info("tool_execution_calculator", query=query)
    
    # Try to extract numbers and match common scenarios
    numbers = [float(x) for x in re.findall(r"\d+\.?\d*", query)]
    
    # Contextual parser
    if "percent" in query.lower() or "%" in query.lower():
        # E.g., "dilute 2% concentration in 10 liters"
        percent = None
        liters = None
        for word in query.lower().split():
            if "%" in word:
                try:
                    percent = float(word.replace("%", ""))
                except ValueError:
                    pass
            elif "percent" in word:
                # Find preceding number
                pass
        
        # Fallback to order of numbers
        if not percent and len(numbers) >= 1:
            percent = numbers[0]
        if len(numbers) >= 2:
            liters = numbers[1]
            
        if percent is not None and liters is not None:
            required = (percent / 100.0) * liters
            required_ml = required * 1000.0
            return (
                f"Calculation Result: For a {percent}% concentration in {liters} liters of water, "
                f"you need {required:.3f} liters (or {required_ml:.1f} ml) of the active product."
            )

    # General expression safe solver
    # Extract basic math expression like "5 * 2.5" or "100 / 4"
    math_match = re.search(r"(\d+\.?\d*\s*[\+\-\*\/]\s*\d+\.?\d*)", query)
    if math_match:
        expr = math_match.group(1)
        try:
            # Safe eval of simple math characters only
            if all(c in "0123456789.+-*/() " for c in expr):
                res = eval(expr)
                return f"Calculation Result: {expr} = {res:.3f}"
        except Exception:
            pass

    return "Calculation Result: Dilution recommendation is standard 1:100 ratio (10 ml per 1 liter of water)."


def extension_directory_tool(query: str) -> str:
    """
    Look up local Agricultural Extension contact directory.
    """
    logger.info("tool_execution_directory", query=query)
    q_lower = query.lower()
    
    directory = {
        "california": "University of California Cooperative Extension (UCCE)\n- Phone: (530) 750-1200\n- Email: ceinfo@ucanr.edu\n- Website: https://ucanr.edu",
        "florida": "University of Florida IFAS Extension\n- Phone: (352) 392-1761\n- Email: extension@ifas.ufl.edu\n- Website: https://sfyl.ifas.ufl.edu",
        "texas": "Texas A&M AgriLife Extension Service\n- Phone: (979) 845-7800\n- Email: agrilife@tamu.edu\n- Website: https://agrilifeextension.tamu.edu",
        "new york": "Cornell Cooperative Extension (CCE)\n- Phone: (607) 255-2237\n- Email: cce@cornell.edu\n- Website: https://cce.cornell.edu",
        "oregon": "Oregon State University Extension Service\n- Phone: (541) 737-2713\n- Email: extension.info@oregonstate.edu\n- Website: https://extension.oregonstate.edu"
    }
    
    for state, details in directory.items():
        if state in q_lower:
            return f"Agricultural Extension Contact for {state.title()}:\n{details}"
            
    return (
        "National USDA Extension Directory:\n"
        "- USDA National Institute of Food and Agriculture (NIFA)\n"
        "- Contact Phone: (202) 720-2791\n"
        "- For local help, please specify state name (e.g. California, Texas, Florida, Cornell/New York)."
    )


async def check_and_execute_agent_workflow(user_message: str, model_name: str | None = None) -> str | None:
    """
    Checks if a tool is needed for the query.
    If yes, executes the tool and returns a fully synthesized answer.
    If no, returns None to allow regular RAG workflow.
    """
    q_lower = user_message.lower()
    
    # 1. Check for calculation triggers
    calc_keywords = ["calculate", "math", "dilution", "dosage", "how much ml", "liters of water", "concentration", "ratio"]
    is_calc = any(kw in q_lower for kw in calc_keywords) and any(c.isdigit() for c in user_message)
    
    # 2. Check for contact/directory triggers
    contact_keywords = ["extension office", "local expert", "agriculture department", "directory", "contact number", "call expert"]
    is_contact = any(kw in q_lower for kw in contact_keywords)
    
    if not is_calc and not is_contact:
        return None
        
    tool_output = ""
    if is_calc:
        tool_output = calculator_tool(user_message)
    elif is_contact:
        tool_output = extension_directory_tool(user_message)
        
    # Synthesize response using LLM with tool output
    system_prompt = (
        "You are PlantMD, a helpful agricultural agent.\n"
        "You have executed a system tool to solve the user's request.\n"
        f"Tool Result:\n{tool_output}\n\n"
        "Formulate a complete, professional, and friendly answer. Explain the results clearly to the user."
    )
    
    messages = build_messages(system_prompt, [], user_message)
    
    try:
        from app.services.rag import get_llm_model_override
        model_override = get_llm_model_override(model_name)
        response = await generate_completion(messages, model_override)
        return response
    except Exception as e:
        logger.error("agent_synthesis_failed", error=str(e))
        return f"{tool_output}\n\n*Note: Self-synthesized response fallback.*"
