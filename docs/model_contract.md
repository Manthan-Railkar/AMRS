# AMRS Model Contract

## Model Adaptation & Interface Requirements

Models managed by AMRS must satisfy the standard PyTorch model interface:

1. **Forward Pass**: Must accept a batch of images `torch.Tensor` of shape `[B, C, H, W]` and return unnormalized logit predictions `torch.Tensor` of shape `[B, num_classes]`.
2. **Device Independence**: Model modules must support migration via standard `.to(device)` methods (`cpu`, `cuda`).
3. **Weight Checkpoints**: State dicts must be serializable using safe PyTorch mechanisms (`weights_only=True` compatible where possible).
4. **Custom Architectures**: Custom user models are quarantined and require explicit execution flags (`--allow-custom-code`).

