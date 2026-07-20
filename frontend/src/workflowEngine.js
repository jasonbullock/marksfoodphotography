export const WORKFLOW_OWNERS = {
  receiving: 'Receiving',
  projectManagement: 'Project Management',
  creativeForce: 'Creative Force',
  delivery: 'Delivery',
};

export const WORKFLOW_STATUS = {
  notStarted: 'not_started',
  blocked: 'blocked',
  waiting: 'waiting',
  ready: 'ready',
  inProgress: 'in_progress',
  complete: 'complete',
};

export const OUTPUT_TYPES = {
  photography: 'Photography',
  scan: 'Scan',
  thr3d: 'THR3D',
  video: 'Video',
  other: 'Other',
};

export const REQUIREMENT_KEYS = {
  productInformation: 'product-information',
  artwork: 'artwork',
  activationInformation: 'activation-information',
};

export const GATE_IDS = {
  newReview: 'new-review',
  waitingInformation: 'waiting-info',
  sendThr3d: 'send-thr3d',
  waitingActivation: 'waiting-activation',
  readyProduction: 'ready-production',
};

export const MERCHANDISE_REVIEW_WORKFLOW = {
  id: 'merchandise-review',
  name: 'Merchandise Review',
  owner: WORKFLOW_OWNERS.projectManagement,
  description: 'Determine what physical merchandise needs before it can be released to production.',
  gates: [
    {
      id: GATE_IDS.newReview,
      name: 'review',
      displayName: 'New Items for Review',
      description: 'Newly received merchandise awaiting first review.',
      order: 10,
      owner: WORKFLOW_OWNERS.projectManagement,
      status: WORKFLOW_STATUS.notStarted,
      requiredData: [],
      allowedNextGates: [GATE_IDS.waitingInformation, GATE_IDS.sendThr3d, GATE_IDS.waitingActivation, GATE_IDS.readyProduction],
      actions: ['review-merchandise', 'choose-output-type'],
    },
    {
      id: GATE_IDS.waitingInformation,
      name: 'waiting_information',
      displayName: 'Waiting for Information',
      description: 'Required product, identifier, artwork, or client fields need attention.',
      order: 20,
      owner: WORKFLOW_OWNERS.projectManagement,
      status: WORKFLOW_STATUS.blocked,
      requiredData: [REQUIREMENT_KEYS.productInformation],
      allowedNextGates: [GATE_IDS.newReview, GATE_IDS.sendThr3d, GATE_IDS.waitingActivation, GATE_IDS.readyProduction],
      actions: ['resolve-required-data', 'override-artwork'],
    },
    {
      id: GATE_IDS.sendThr3d,
      name: 'thr3d_decision',
      displayName: 'Send to THR3D',
      description: 'Merchandise routed into the THR3D workflow branch.',
      order: 30,
      owner: WORKFLOW_OWNERS.projectManagement,
      status: WORKFLOW_STATUS.ready,
      requiredData: [REQUIREMENT_KEYS.productInformation],
      allowedNextGates: [GATE_IDS.waitingActivation, GATE_IDS.readyProduction],
      actions: ['confirm-thr3d-routing'],
      outputType: OUTPUT_TYPES.thr3d,
    },
    {
      id: GATE_IDS.waitingActivation,
      name: 'activation',
      displayName: 'Waiting for Activation',
      description: 'Ready except for activation or campaign assignment.',
      order: 40,
      owner: WORKFLOW_OWNERS.projectManagement,
      status: WORKFLOW_STATUS.waiting,
      requiredData: [REQUIREMENT_KEYS.productInformation, REQUIREMENT_KEYS.artwork],
      allowedNextGates: [GATE_IDS.readyProduction],
      actions: ['attach-activation'],
    },
    {
      id: GATE_IDS.readyProduction,
      name: 'release_to_production',
      displayName: 'Ready for Production',
      description: 'All required gates are satisfied.',
      order: 50,
      owner: WORKFLOW_OWNERS.projectManagement,
      status: WORKFLOW_STATUS.ready,
      requiredData: [
        REQUIREMENT_KEYS.productInformation,
        REQUIREMENT_KEYS.artwork,
        REQUIREMENT_KEYS.activationInformation,
      ],
      allowedNextGates: ['production'],
      actions: ['release-to-production'],
    },
  ],
};

function textIncludes(value, terms = []) {
  const text = String(value || '').toLowerCase();
  return terms.some(term => text.includes(term));
}

function referenceValueFor(record, terms = []) {
  const product = record?.linkedItem || {};
  const referenceData = product.referenceData || {};
  const candidates = [
    product.activation,
    product.campaign,
    product.campaignAssignment,
    product.activationEmail,
    product.productionInstructions,
    product.itemJobNumber,
    product.pickupJobNumber,
    ...Object.entries(referenceData).flatMap(([key, value]) => (
      textIncludes(key, terms) ? [value] : []
    )),
  ];
  return candidates.find(value => String(value || '').trim());
}

function missingProductReasons(record) {
  const product = record?.linkedItem || null;
  const readiness = product?.readiness || {};
  const missing = readiness.missing || [];
  const productMissing = missing.filter(item => !/artwork/i.test(item));
  const reasons = [];
  if (!product || !(record?.itemIds?.length || product.id)) reasons.push('Product Information');
  if (!record?.skuId && !product?.identifier && !product?.productId) reasons.push('Required Identifier');
  if (productMissing.length) reasons.push(...productMissing);
  if (record?.isUnidentified) reasons.push('Merchandise identity');
  if (record?.blockingIssues?.length) reasons.push('Blocking Merchandise Issue');
  return reasons;
}

function productInformationRequirement(record) {
  const reasons = missingProductReasons(record);
  const product = record?.linkedItem || {};
  if (reasons.length) {
    return {
      key: REQUIREMENT_KEYS.productInformation,
      label: 'Product Information',
      status: record?.linkedItem ? WORKFLOW_STATUS.waiting : WORKFLOW_STATUS.blocked,
      tone: record?.linkedItem ? 'orange' : 'red',
      detail: reasons.join(', '),
      satisfied: false,
      overrideAllowed: false,
    };
  }
  const warnings = product.readiness?.warnings || [];
  return {
    key: REQUIREMENT_KEYS.productInformation,
    label: 'Product Information',
    status: warnings.length ? WORKFLOW_STATUS.waiting : WORKFLOW_STATUS.complete,
    tone: warnings.length ? 'orange' : 'green',
    detail: warnings.length ? warnings.join(', ') : 'Complete',
    satisfied: !warnings.length,
    overrideAllowed: false,
  };
}

function artworkRequirement(record, override) {
  if (override) {
    return {
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.complete,
      tone: 'green',
      detail: `${override.status === 'not-required' ? 'Not required' : 'Approved to proceed'} by ${override.user || 'PM'}: ${override.reason}`,
      satisfied: true,
      overrideAllowed: true,
      overridden: true,
    };
  }
  const product = record?.linkedItem || {};
  const missing = product.readiness?.missing || [];
  const artworkMissing = missing.find(item => /artwork/i.test(item));
  if (product.artworkReceived) {
    return {
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.complete,
      tone: 'green',
      detail: 'Complete',
      satisfied: true,
      overrideAllowed: true,
    };
  }
  if (artworkMissing || product.readiness?.state === 'missing_artwork') {
    return {
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.blocked,
      tone: 'red',
      detail: artworkMissing || 'Artwork is required.',
      satisfied: false,
      overrideAllowed: true,
    };
  }
  return {
    key: REQUIREMENT_KEYS.artwork,
    label: 'Artwork',
    status: WORKFLOW_STATUS.waiting,
    tone: 'orange',
    detail: 'Not received or pending confirmation',
    satisfied: false,
    overrideAllowed: true,
  };
}

function activationInformationRequirement(record) {
  const activation = referenceValueFor(record, ['activation', 'campaign']);
  if (activation) {
    return {
      key: REQUIREMENT_KEYS.activationInformation,
      label: 'Activation Information',
      status: WORKFLOW_STATUS.complete,
      tone: 'green',
      detail: `Complete: ${activation}`,
      satisfied: true,
      overrideAllowed: false,
    };
  }
  if (!record?.linkedItem) {
    return {
      key: REQUIREMENT_KEYS.activationInformation,
      label: 'Activation Information',
      status: WORKFLOW_STATUS.blocked,
      tone: 'red',
      detail: 'Product information is required first',
      satisfied: false,
      overrideAllowed: false,
    };
  }
  return {
    key: REQUIREMENT_KEYS.activationInformation,
    label: 'Activation Information',
    status: WORKFLOW_STATUS.waiting,
    tone: 'orange',
    detail: 'Waiting for campaign assignment',
    satisfied: false,
    overrideAllowed: false,
  };
}

export function evaluateMerchandiseReviewRequirements(record, { artworkOverride } = {}) {
  return [
    productInformationRequirement(record),
    artworkRequirement(record, artworkOverride),
    activationInformationRequirement(record),
  ];
}

function isThr3dRecord(record) {
  const product = record?.linkedItem || {};
  return [
    record?.merchStatus,
    record?.notes,
    product.output,
    product.status,
    product.referenceDataRaw,
  ].some(value => textIncludes(value, ['thr3d', 'thread', '3d']));
}

function requirementByKey(requirements, key) {
  return requirements.find(requirement => requirement.key === key) || {};
}

export function deriveMerchandiseReviewGate(record, requirements, requestedGateId, reviewState) {
  if (requestedGateId === GATE_IDS.newReview || requestedGateId === GATE_IDS.waitingInformation) return requestedGateId;
  if (requestedGateId === GATE_IDS.sendThr3d) return GATE_IDS.sendThr3d;
  if (isThr3dRecord(record)) return GATE_IDS.sendThr3d;

  const product = requirementByKey(requirements, REQUIREMENT_KEYS.productInformation);
  const artwork = requirementByKey(requirements, REQUIREMENT_KEYS.artwork);
  const activation = requirementByKey(requirements, REQUIREMENT_KEYS.activationInformation);

  if (!product.satisfied || artwork.status === WORKFLOW_STATUS.blocked) return GATE_IDS.waitingInformation;
  if (requestedGateId === GATE_IDS.waitingActivation || !activation.satisfied) return GATE_IDS.waitingActivation;
  if (requestedGateId === GATE_IDS.readyProduction && requirements.every(requirement => requirement.satisfied)) return GATE_IDS.readyProduction;
  if (reviewState === 'Validated' && requirements.every(requirement => requirement.satisfied)) return GATE_IDS.readyProduction;
  return GATE_IDS.newReview;
}

export function createWorkflowAssignment({ workflow = MERCHANDISE_REVIEW_WORKFLOW, record, gateId, requirements, owner } = {}) {
  const gate = workflow.gates.find(item => item.id === gateId) || workflow.gates[0];
  return {
    workflowId: workflow.id,
    subjectType: 'merchandise',
    subjectId: record?.id || '',
    currentGate: gate.id,
    currentGateName: gate.displayName,
    currentOwner: owner || gate.owner || workflow.owner,
    currentStatus: gate.status || WORKFLOW_STATUS.notStarted,
    requirements,
    availableActions: gate.actions || [],
    allowedNextGates: gate.allowedNextGates || [],
  };
}

export function evaluateMerchandiseReviewAssignment(record, { artworkOverride, requestedGateId, reviewState } = {}) {
  const requirements = evaluateMerchandiseReviewRequirements(record, { artworkOverride });
  const gateId = deriveMerchandiseReviewGate(record, requirements, requestedGateId, reviewState);
  return createWorkflowAssignment({ record, gateId, requirements });
}

export function validateWorkflowTransition(workflow, assignment, destinationGateId) {
  const gate = workflow.gates.find(item => item.id === destinationGateId);
  if (!gate) {
    return { allowed: false, message: 'Cannot move to an unknown workflow gate.' };
  }
  const missing = (gate.requiredData || [])
    .map(key => requirementByKey(assignment.requirements || [], key))
    .filter(requirement => !requirement.satisfied)
    .map(requirement => requirement.label || requirement.key);

  return {
    allowed: missing.length === 0,
    message: missing.length ? `Cannot move to ${gate.displayName}.\nMissing: ${missing.join(', ')}` : '',
    missing,
  };
}

export function gatesForBoard(workflow = MERCHANDISE_REVIEW_WORKFLOW) {
  return [...workflow.gates].sort((a, b) => a.order - b.order);
}
