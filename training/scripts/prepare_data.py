"""
Data preparation script for SFT / Instruction Fine-Tuning.
Converts raw bot-user logs, text documents, or PDFs into formatted SFT training pairs.
"""

import os
import json
import argparse


def format_qa_pair(system_prompt: str, user_query: str, assistant_response: str) -> dict:
    """Formats a single Q&A instance into the ShareGPT / OpenAI chat message structure."""
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
            {"role": "assistant", "content": assistant_response}
        ]
    }


def main():
    parser = argparse.ArgumentParser(description="Prepare dataset for chatbot SFT.")
    parser.add_argument("--input_file", type=str, help="Path to raw JSON/txt file")
    parser.add_argument("--output_file", type=str, default="processed_dataset.jsonl", help="Output path for JSONL formatted dataset")
    args = parser.parse_args()

    # Generate dummy agricultural instruction tuning dataset if input_file is not provided
    if not args.input_file or not os.path.exists(args.input_file):
        print("Input file not specified or not found. Generating a high-quality sample agricultural dataset...")
        samples = [
            (
                "You are PlantMD, an expert AI plant disease diagnostician.",
                "How do I treat tomato late blight organically?",
                "Late blight (Phytophthora infestans) can be managed organically by removing infected leaves, ensuring proper spacing for air flow, applying copper fungicides, or using biological agents like Bacillus subtilis."
            ),
            (
                "You are PlantMD, an expert AI plant disease diagnostician.",
                "My coffee plants have orange powdery spots on the bottom of their leaves. What is it?",
                "This symptom strongly indicates Coffee Leaf Rust (Hemileia vastatrix), a devastating fungal disease. Remove and burn heavily infected leaves, and apply organic copper-based sprays to protect healthy foliage."
            ),
            (
                "You are PlantMD, an expert AI plant disease diagnostician.",
                "What causes blossom end rot in peppers?",
                "Blossom end rot is primarily caused by a calcium deficiency in the developing fruit, often triggered by inconsistent watering rather than a lack of calcium in the soil."
            )
        ]
        
        with open(args.output_file, "w", encoding="utf-8") as f:
            for system, user, assistant in samples:
                record = format_qa_pair(system, user, assistant)
                f.write(json.dumps(record) + "\n")
        print(f"Sample dataset saved to: {args.output_file}")
    else:
        print(f"Reading raw data from {args.input_file}...")
        # Custom parsing logic here...
        pass


if __name__ == "__main__":
    main()
