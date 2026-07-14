"""
QLoRA SFT (Supervised Fine-Tuning) script.
Uses Hugging Face TRL and PEFT to perform parameter-efficient fine-tuning on LLMs.
"""

import os
import torch
import argparse
from datasets import load_dataset
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments
)
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer


def run_sft(args):
    # 1. Quantization Configuration
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True
    )

    # 2. Load Tokenizer & Model
    print(f"Loading tokenizer and model for: {args.model_id}")
    tokenizer = AutoTokenizer.from_pretrained(args.model_id)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    model = AutoModelForCausalLM.from_pretrained(
        args.model_id,
        quantization_config=bnb_config,
        device_map="auto"
    )

    # 3. LoRA Configuration
    peft_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        bias="none",
        task_type="CAUSAL_LM"
    )

    # 4. Load Dataset
    print(f"Loading training dataset from: {args.dataset_path}")
    # Supports JSONL dataset from prepare_data.py
    dataset = load_dataset("json", data_files=args.dataset_path, split="train")

    def format_prompts(batch):
        # Format dataset messages to LLM chat template format
        texts = []
        for messages in batch["messages"]:
            formatted = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
            texts.append(formatted)
        return {"text": texts}

    dataset = dataset.map(format_prompts, batched=True)

    # 5. Training Arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.learning_rate,
        logging_steps=10,
        num_train_epochs=args.epochs,
        bf16=torch.cuda.is_bf16_supported(),
        fp16=not torch.cuda.is_bf16_supported(),
        optim="paged_adamw_8bit",
        save_strategy="epoch",
        deepspeed=args.deepspeed_config if args.deepspeed_config else None,
        report_to="none"
    )

    # 6. Initialize Trainer
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        peft_config=peft_config,
        dataset_text_field="text",
        max_seq_length=args.max_length,
        tokenizer=tokenizer,
        args=training_args
    )

    print("Starting SFT training...")
    trainer.train()
    
    # Save the adapter
    print(f"Saving fine-tuned adapter to: {args.output_dir}")
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)
    print("Training completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QLoRA SFT Fine-Tuning")
    parser.add_argument("--model_id", type=str, default="Qwen/Qwen2.5-7B-Instruct", help="Hugging Face base model ID")
    parser.add_argument("--dataset_path", type=str, default="processed_dataset.jsonl", help="Path to processed JSONL dataset")
    parser.add_argument("--output_dir", type=str, default="./results", help="Directory to save checkpoint weights")
    parser.add_argument("--deepspeed_config", type=str, default=None, help="Path to DeepSpeed config JSON file")
    parser.add_argument("--lora_r", type=int, default=16, help="LoRA rank")
    parser.add_argument("--lora_alpha", type=int, default=32, help="LoRA alpha scaling factor")
    parser.add_argument("--lora_dropout", type=float, default=0.05, help="LoRA dropout rate")
    parser.add_argument("--batch_size", type=int, default=4, help="Micro-batch size per device")
    parser.add_argument("--grad_accum", type=int, default=4, help="Gradient accumulation steps")
    parser.add_argument("--learning_rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--max_length", type=int, default=2048, help="Maximum sequence context length")

    args = parser.parse_args()
    run_sft(args)
