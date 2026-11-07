"""Pre-built failure scenario endpoints."""

from fastapi import APIRouter

from amrs.schemas import ScenarioItem, ScenarioListResponse

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

SCENARIOS_CATALOG: list[ScenarioItem] = [
    ScenarioItem(
        scenario_id="s1_overfit",
        name="S1 Overfit",
        description="ResNet-18 trained on limited CIFAR-10 subset with high train accuracy and low validation accuracy.",
        ground_truth_label="overfitting",
        arch="resnet18_cifar",
        artifacts_ready=True,
    ),
    ScenarioItem(
        scenario_id="s2_miscalibration",
        name="S2 Miscalibration",
        description="Model with scaled final-layer logits producing inflated confidence and high ECE.",
        ground_truth_label="miscalibration",
        arch="resnet18_cifar",
        artifacts_ready=True,
    ),
    ScenarioItem(
        scenario_id="s3_bn_drift",
        name="S3 BatchNorm Drift",
        description="Covariate shift with drifted BatchNorm running mean and variance.",
        ground_truth_label="bn_drift",
        arch="resnet18_cifar",
        artifacts_ready=True,
    ),
    ScenarioItem(
        scenario_id="s4_instability",
        name="S4 Training Instability",
        description="Model trained with excessive learning rate resulting in loss spike at final weights.",
        ground_truth_label="instability",
        arch="resnet18_cifar",
        artifacts_ready=True,
    ),
    ScenarioItem(
        scenario_id="s5_degraded_head",
        name="S5 Degraded Head",
        description="Penultimate features intact, but classification head degraded by noisy labels.",
        ground_truth_label="head_degradation",
        arch="resnet18_cifar",
        artifacts_ready=True,
    ),
    ScenarioItem(
        scenario_id="s6_healthy",
        name="S6 Healthy Control",
        description="Well-regularized model serving as negative control; no recovery intervention accepted.",
        ground_truth_label="healthy",
        arch="resnet18_cifar",
        artifacts_ready=True,
    ),
]


@router.get(
    "",
    response_model=ScenarioListResponse,
    summary="List reproducible scenarios",
    description="List all 6 reference benchmark scenarios (S1-S6) and their artifact readiness.",
)
async def list_scenarios() -> ScenarioListResponse:
    return ScenarioListResponse(
        scenarios=SCENARIOS_CATALOG,
        total=len(SCENARIOS_CATALOG),
    )
