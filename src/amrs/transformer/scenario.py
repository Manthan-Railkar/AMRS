"""Reproducible, lightweight transformer classification scenario for CI and offline benchmarking (ML-10)."""

from __future__ import annotations

from typing import Any
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

try:
    from transformers import BertConfig, BertForSequenceClassification
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


def build_tiny_transformer_classifier(
    vocab_size: int = 128,
    hidden_size: int = 32,
    num_heads: int = 2,
    num_layers: int = 2,
    num_labels: int = 2,
    seed: int = 1234,
) -> nn.Module:
    """Build a lightweight, offline BertForSequenceClassification model for CI and testing."""
    if not TRANSFORMERS_AVAILABLE:
        raise RuntimeError("Transformers library is required to build transformer scenario.")

    torch.manual_seed(seed)
    config = BertConfig(
        vocab_size=vocab_size,
        hidden_size=hidden_size,
        num_attention_heads=num_heads,
        num_hidden_layers=num_layers,
        intermediate_size=hidden_size * 2,
        num_labels=num_labels,
        classifier_dropout=0.1,
    )
    return BertForSequenceClassification(config)


def create_tiny_transformer_data(
    n_samples: int = 300,
    seq_len: int = 16,
    vocab_size: int = 128,
    batch_size: int = 20,
    seed: int = 1234,
) -> tuple[DataLoader, DataLoader, DataLoader]:
    """Generate train, val, and holdout DataLoader splits for sequence classification."""
    torch.manual_seed(seed)
    
    # Generate synthetic input_ids
    # Signal: presence of specific token markers (e.g. tokens > vocab_size / 2) determines class
    input_ids = torch.randint(0, vocab_size, (n_samples, seq_len), dtype=torch.long)
    token_signal = (input_ids > (vocab_size // 2)).sum(dim=1)
    labels = (token_signal > (seq_len // 2)).long()

    # Split 100 train, 100 val, 100 holdout
    n_per_split = n_samples // 3
    train_x, train_y = input_ids[:n_per_split], labels[:n_per_split]
    val_x, val_y = input_ids[n_per_split : 2 * n_per_split], labels[n_per_split : 2 * n_per_split]
    holdout_x, holdout_y = input_ids[2 * n_per_split :], labels[2 * n_per_split :]

    train_loader = DataLoader(TensorDataset(train_x, train_y), batch_size=batch_size, shuffle=False)
    val_loader = DataLoader(TensorDataset(val_x, val_y), batch_size=batch_size, shuffle=False)
    holdout_loader = DataLoader(TensorDataset(holdout_x, holdout_y), batch_size=batch_size, shuffle=False)

    return train_loader, val_loader, holdout_loader


def create_transformer_scenario(
    seed: int = 1234,
    degrade_base: bool = True,
) -> tuple[nn.Module, DataLoader, DataLoader, DataLoader]:
    """Create complete end-to-end transformer scenario with base model and 3-split data."""
    model = build_tiny_transformer_classifier(seed=seed)
    train_loader, val_loader, holdout_loader = create_tiny_transformer_data(seed=seed)

    if degrade_base:
        # Zero out classifier weights to simulate degraded / unadapted classification performance
        with torch.no_grad():
            if hasattr(model, "classifier"):
                model.classifier.weight.zero_()
                model.classifier.bias.zero_()

    return model, train_loader, val_loader, holdout_loader

