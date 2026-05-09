"""
LangGraph agent definition for MedAuth AI
"""

from typing import Any, Dict, Optional, TypedDict
from langgraph.graph import StateGraph, END

from .nodes import (
    parse_clinical_input_node,
    payer_lookup_node,
    drug_criteria_node,
    ui_schema_generator_node,
    generate_appeal_node,
)


class MedAuthState(TypedDict):
    user_input: str
    parsed_clinical: Optional[Dict[str, Any]]
    payer_data: Optional[Dict[str, Any]]
    drug_data: Optional[Dict[str, Any]]
    ui_schema: Optional[Dict[str, Any]]
    appeal_letter: Optional[str]
    denial_reason: Optional[str]
    resolved_payer_id: Optional[str]
    resolved_drug_id: Optional[str]
    agent_step: Optional[str]
    generate_appeal: Optional[bool]


def should_generate_appeal(state: MedAuthState) -> str:
    if state.get("generate_appeal", False):
        return "appeal"
    return END


def build_graph() -> StateGraph:
    graph = StateGraph(MedAuthState)

    graph.add_node("parse", parse_clinical_input_node)
    graph.add_node("payer_lookup", payer_lookup_node)
    graph.add_node("drug_criteria", drug_criteria_node)
    graph.add_node("ui_schema_generator", ui_schema_generator_node)
    graph.add_node("appeal", generate_appeal_node)

    graph.set_entry_point("parse")
    graph.add_edge("parse", "payer_lookup")
    graph.add_edge("payer_lookup", "drug_criteria")
    graph.add_edge("drug_criteria", "ui_schema_generator")
    graph.add_conditional_edges(
        "ui_schema_generator",
        should_generate_appeal,
        {"appeal": "appeal", END: END}
    )
    graph.add_edge("appeal", END)

    return graph.compile()


# Singleton compiled graph
_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph

