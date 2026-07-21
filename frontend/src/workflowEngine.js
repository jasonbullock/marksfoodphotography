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
  notApplicable: 'not_applicable',
};

export const WORKSPACE_MODES = {
  modal: 'modal',
  drawer: 'drawer',
  readonly: 'readonly',
};

export const WORKSTREAM_IDS = {
  ecommPhoto: 'ecomm-photo',
  packagingPhoto: 'packaging-photo',
  thr3d: 'thr3d',
};

export const WORKSTREAMS = [
  {
    id: WORKSTREAM_IDS.ecommPhoto,
    label: 'Ecomm Photo',
    description: 'Ecommerce photography workstream.',
    active: true,
    workflowTemplate: 'ecomm-review',
    workflowName: 'Ecomm Review',
    initialGate: 'new-review',
    requiredReviewData: ['product-information', 'artwork', 'activation-information'],
    jobRequired: false,
    producerRequired: false,
    schedulingRequired: false,
    externalDestination: 'Creative Force',
  },
  {
    id: WORKSTREAM_IDS.packagingPhoto,
    label: 'Packaging Photo',
    description: 'Packaging photography workstream.',
    active: true,
    workflowTemplate: 'packaging-review',
    workflowName: 'Packaging Review',
    initialGate: 'new-review',
    requiredReviewData: ['product-information', 'producer-preproduction'],
    jobRequired: false,
    producerRequired: true,
    schedulingRequired: true,
    externalDestination: 'Creative Force',
  },
  {
    id: WORKSTREAM_IDS.thr3d,
    label: 'Thr3d',
    description: 'Thr3d routing workstream.',
    active: true,
    workflowTemplate: 'thr3d-review',
    workflowName: 'Thr3d Review',
    initialGate: 'new-review',
    requiredReviewData: ['product-information', 'thr3d-routing'],
    jobRequired: false,
    producerRequired: false,
    schedulingRequired: false,
    externalDestination: 'Thr3d',
  },
];

export const REQUIREMENT_KEYS = {
  merchandiseVerified: 'merchandise-verified',
  productInformation: 'product-information',
  deliverables: 'deliverables',
  artwork: 'artwork',
  activationInformation: 'activation-information',
};

export const GATE_IDS = {
  newReview: 'new-review',
  waitingInformation: 'waiting-info',
  sendThr3d: 'send-thr3d',
  waitingActivation: 'waiting-activation',
  readyProduction: 'ready-production',
  productionScheduled: 'production-scheduled',
  productionInProgress: 'production-in-progress',
  productionQc: 'production-qc',
  productionComplete: 'production-complete',
};

export const WORKFLOW_BOARD_IDS = {
  planning: 'planning',
  production: 'production',
};

export const WORKFLOW_BOARD_STATE_MODEL = {
  [WORKFLOW_BOARD_IDS.planning]: {
    id: WORKFLOW_BOARD_IDS.planning,
    label: 'Planning Board',
    owner: WORKFLOW_OWNERS.projectManagement,
    owns: [GATE_IDS.newReview, GATE_IDS.waitingActivation, GATE_IDS.waitingInformation],
    shared: [GATE_IDS.readyProduction],
    columns: [GATE_IDS.newReview, GATE_IDS.waitingActivation, GATE_IDS.waitingInformation, GATE_IDS.readyProduction],
  },
  [WORKFLOW_BOARD_IDS.production]: {
    id: WORKFLOW_BOARD_IDS.production,
    label: 'Production Board',
    owner: 'Production',
    owns: [GATE_IDS.productionScheduled, GATE_IDS.productionInProgress, GATE_IDS.productionQc, GATE_IDS.productionComplete],
    shared: [GATE_IDS.readyProduction],
    columns: [
      GATE_IDS.readyProduction,
      GATE_IDS.productionScheduled,
      GATE_IDS.productionInProgress,
      GATE_IDS.productionQc,
      GATE_IDS.productionComplete,
    ],
  },
};

export const WORKSPACE_SECTIONS = {
  merchandiseObservations: 'merchandise-observations',
  photos: 'photos',
  productIdentification: 'product-identification',
  productIdentificationSummary: 'product-identification-summary',
  workstream: 'workstream',
  missingInformation: 'missing-information',
  artwork: 'artwork',
  artworkSummary: 'artwork-summary',
  activation: 'activation',
  notes: 'notes',
  thr3dRouting: 'thr3d-routing',
  shipment: 'shipment',
  issues: 'issues',
  history: 'history',
  readinessSummary: 'required-to-shoot',
  merchandiseSummary: 'merchandise-summary',
  productSummary: 'product-summary',
};

export const CARD_FIELDS = {
  thumbnail: 'thumbnail',
  observedPackageName: 'observedPackageName',
  client: 'client',
  observedIdentifier: 'observedIdentifier',
  storageLocation: 'storageLocation',
  timeHere: 'timeHere',
  quantity: 'quantity',
  issueIndicator: 'issueIndicator',
  readiness: 'requiredToShoot',
};

function gate({
  id,
  label,
  description,
  order,
  visible = true,
  ownerRole = WORKFLOW_OWNERS.projectManagement,
  entryCriteria = [],
  exitCriteria = [],
  allowedNextGates = [],
  transitionMode = 'validated',
  workspaceMode = WORKSPACE_MODES.drawer,
  cardFields = [
    CARD_FIELDS.thumbnail,
    CARD_FIELDS.observedPackageName,
    CARD_FIELDS.client,
    CARD_FIELDS.observedIdentifier,
    CARD_FIELDS.storageLocation,
    CARD_FIELDS.timeHere,
    CARD_FIELDS.quantity,
    CARD_FIELDS.issueIndicator,
    CARD_FIELDS.readiness,
  ],
  workspaceSections = [],
  workstream = '',
}) {
  return {
    id,
    label,
    displayName: label,
    description,
    order,
    boardVisible: visible,
    visible,
    ownerRole,
    owner: ownerRole,
    entryCriteria,
    exitCriteria,
    requiredData: entryCriteria,
    allowedNextGates,
    transitionMode,
    workspaceMode,
    cardFields,
    workspaceSections,
    workstream,
  };
}

export const MERCHANDISE_REVIEW_WORKFLOW = {
  id: 'merchandise-review',
  name: 'Planning Board',
  owner: WORKFLOW_OWNERS.projectManagement,
  defaultFor: 'merchandise-review',
  description: 'A PM-owned planning board for resolving what is required to shoot before production accepts the work.',
  gates: [
    gate({
      id: GATE_IDS.newReview,
      label: 'New',
      description: 'Newly received merchandise awaiting PM verification.',
      order: 10,
      exitCriteria: [REQUIREMENT_KEYS.merchandiseVerified],
      allowedNextGates: [GATE_IDS.waitingInformation, GATE_IDS.sendThr3d, GATE_IDS.waitingActivation, GATE_IDS.readyProduction],
      workspaceMode: WORKSPACE_MODES.modal,
      workspaceSections: [
        WORKSPACE_SECTIONS.merchandiseObservations,
        WORKSPACE_SECTIONS.photos,
        WORKSPACE_SECTIONS.productIdentification,
        WORKSPACE_SECTIONS.workstream,
        WORKSPACE_SECTIONS.readinessSummary,
      ],
    }),
    gate({
      id: GATE_IDS.waitingInformation,
      label: 'Waiting',
      description: 'PM-owned queue for client answers, files, or decisions.',
      order: 20,
      exitCriteria: [REQUIREMENT_KEYS.productInformation, REQUIREMENT_KEYS.artwork, REQUIREMENT_KEYS.activationInformation],
      allowedNextGates: [GATE_IDS.newReview, GATE_IDS.sendThr3d, GATE_IDS.waitingActivation, GATE_IDS.readyProduction],
      workspaceSections: [
        WORKSPACE_SECTIONS.missingInformation,
        WORKSPACE_SECTIONS.productIdentification,
        WORKSPACE_SECTIONS.artwork,
        WORKSPACE_SECTIONS.activation,
        WORKSPACE_SECTIONS.notes,
        WORKSPACE_SECTIONS.readinessSummary,
      ],
    }),
    gate({
      id: GATE_IDS.sendThr3d,
      label: 'Ready for Thr3d Shipping',
      description: 'Verified merchandise ready for a dedicated Thr3d shipping workspace.',
      order: 30,
      entryCriteria: [REQUIREMENT_KEYS.merchandiseVerified, REQUIREMENT_KEYS.deliverables],
      exitCriteria: [REQUIREMENT_KEYS.merchandiseVerified, REQUIREMENT_KEYS.deliverables],
      allowedNextGates: [GATE_IDS.waitingActivation, GATE_IDS.readyProduction],
      workspaceSections: [
        WORKSPACE_SECTIONS.merchandiseObservations,
        WORKSPACE_SECTIONS.photos,
        WORKSPACE_SECTIONS.productIdentification,
        WORKSPACE_SECTIONS.workstream,
        WORKSPACE_SECTIONS.thr3dRouting,
        WORKSPACE_SECTIONS.readinessSummary,
      ],
      workstream: WORKSTREAM_IDS.thr3d,
    }),
    gate({
      id: GATE_IDS.waitingActivation,
      label: 'Planning',
      description: 'PM-controlled planning queue.',
      order: 40,
      entryCriteria: [REQUIREMENT_KEYS.productInformation, REQUIREMENT_KEYS.artwork],
      exitCriteria: [REQUIREMENT_KEYS.activationInformation],
      allowedNextGates: [GATE_IDS.readyProduction],
      workspaceSections: [
        WORKSPACE_SECTIONS.productIdentificationSummary,
        WORKSPACE_SECTIONS.artworkSummary,
        WORKSPACE_SECTIONS.activation,
        WORKSPACE_SECTIONS.issues,
        WORKSPACE_SECTIONS.readinessSummary,
      ],
    }),
    gate({
      id: GATE_IDS.readyProduction,
      label: 'Ready for Photo',
      description: 'All required information for the selected photo deliverables is complete.',
      order: 50,
      workspaceMode: WORKSPACE_MODES.readonly,
      entryCriteria: [
        REQUIREMENT_KEYS.merchandiseVerified,
        REQUIREMENT_KEYS.productInformation,
        REQUIREMENT_KEYS.deliverables,
      ],
      allowedNextGates: [],
      workspaceSections: [
        WORKSPACE_SECTIONS.merchandiseSummary,
        WORKSPACE_SECTIONS.productSummary,
        WORKSPACE_SECTIONS.workstream,
        WORKSPACE_SECTIONS.readinessSummary,
        WORKSPACE_SECTIONS.history,
      ],
    }),
  ],
};

export const WORKFLOW_REGISTRY = {
  defaultWorkflowId: MERCHANDISE_REVIEW_WORKFLOW.id,
  workflows: {
    [MERCHANDISE_REVIEW_WORKFLOW.id]: MERCHANDISE_REVIEW_WORKFLOW,
  },
  clientWorkflowAssignments: {},
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

function requirementState({ key, label, tone, detail, satisfied, status, overrideAllowed = false, overridden = false, applicable = true }) {
  return {
    key,
    label,
    status,
    tone,
    detail,
    satisfied,
    overrideAllowed,
    overridden,
    applicable,
    visible: applicable,
    tooltip: `${label}\n${statusLabel(status)}\n${detail}`,
  };
}

function statusLabel(status) {
  if (status === WORKFLOW_STATUS.complete) return 'Complete';
  if (status === WORKFLOW_STATUS.blocked) return 'Missing';
  if (status === WORKFLOW_STATUS.waiting) return 'Pending';
  if (status === WORKFLOW_STATUS.notApplicable) return 'Not applicable';
  return 'Needs attention';
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
    return requirementState({
      key: REQUIREMENT_KEYS.productInformation,
      label: 'Product Information',
      status: record?.linkedItem ? WORKFLOW_STATUS.waiting : WORKFLOW_STATUS.blocked,
      tone: record?.linkedItem ? 'orange' : 'red',
      detail: reasons.join(', '),
      satisfied: false,
      overrideAllowed: false,
    });
  }
  const warnings = product.readiness?.warnings || [];
  return requirementState({
    key: REQUIREMENT_KEYS.productInformation,
    label: 'Product Information',
    status: warnings.length ? WORKFLOW_STATUS.waiting : WORKFLOW_STATUS.complete,
    tone: warnings.length ? 'orange' : 'green',
    detail: warnings.length ? warnings.join(', ') : 'Complete',
    satisfied: !warnings.length,
    overrideAllowed: false,
  });
}

function deliverableValues(record) {
  const values = Array.isArray(record?.deliverables) ? record.deliverables : [];
  return values.filter(Boolean);
}

function selectedPhotoDeliverables(record) {
  return deliverableValues(record).filter(value => value === 'Packaging Photo' || value === 'Ecomm Photo');
}

function isThr3dOnly(record) {
  const deliverables = deliverableValues(record);
  return deliverables.length === 1 && deliverables[0] === 'Thr3d';
}

function merchandiseVerifiedRequirement(record) {
  const hasIssue = record?.reviewState === 'Issue' || record?.merchStatus === 'Issue' || Boolean(record?.blockingIssues?.length);
  const verified = Boolean(record?.merchandiseVerified) && !hasIssue;
  return requirementState({
    key: REQUIREMENT_KEYS.merchandiseVerified,
    label: 'Merchandise Verified',
    status: verified ? WORKFLOW_STATUS.complete : WORKFLOW_STATUS.blocked,
    tone: verified ? 'green' : 'red',
    detail: hasIssue
      ? 'Resolve the flagged merchandise issue.'
      : verified
        ? 'Complete'
        : 'Confirm the physical merchandise.',
    satisfied: verified,
    overrideAllowed: false,
  });
}

function deliverablesRequirement(record) {
  const deliverables = deliverableValues(record);
  return requirementState({
    key: REQUIREMENT_KEYS.deliverables,
    label: 'Deliverables',
    status: deliverables.length ? WORKFLOW_STATUS.complete : WORKFLOW_STATUS.blocked,
    tone: deliverables.length ? 'green' : 'red',
    detail: deliverables.length ? deliverables.join(', ') : 'Choose Packaging Photo, Ecomm Photo, Thr3d, or a combination.',
    satisfied: deliverables.length > 0,
    overrideAllowed: false,
  });
}

function artworkApplies(record, client) {
  const product = record?.linkedItem || {};
  const values = [
    client?.artworkRequired,
    client?.requiresArtwork,
    product.artworkRequired,
    product.referenceData?.['Artwork Required'],
    product.referenceData?.Artwork,
  ].filter(value => value !== undefined && value !== null && value !== '');
  if (!values.length) return true;
  return !values.some(value => /^(false|no|none|n\/a|not required)$/i.test(String(value).trim()));
}

function activationApplies(record, client) {
  const product = record?.linkedItem || {};
  const values = [
    client?.activationRequired,
    client?.activationEmailRequired,
    client?.requiresActivation,
    product.activationRequired,
    product.referenceData?.['Activation Required'],
    product.referenceData?.Activation,
  ].filter(value => value !== undefined && value !== null && value !== '');
  if (!values.length) return true;
  return !values.some(value => /^(false|no|none|n\/a|not required)$/i.test(String(value).trim()));
}

function artworkRequirement(record, { artworkOverride, client } = {}) {
  if (!artworkApplies(record, client)) {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.notApplicable,
      tone: 'neutral',
      detail: 'Not applicable to this workflow or client',
      satisfied: true,
      overrideAllowed: true,
      applicable: false,
    });
  }
  if (artworkOverride) {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.complete,
      tone: 'green',
      detail: `${artworkOverride.status === 'not-required' ? 'Not required' : 'Approved to proceed'} by ${artworkOverride.user || 'PM'}: ${artworkOverride.reason}`,
      satisfied: true,
      overrideAllowed: true,
      overridden: true,
    });
  }
  const product = record?.linkedItem || {};
  const missing = product.readiness?.missing || [];
  const artworkMissing = missing.find(item => /artwork/i.test(item));
  if (product.artworkReceived) {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.complete,
      tone: 'green',
      detail: 'Complete',
      satisfied: true,
      overrideAllowed: true,
    });
  }
  if (artworkMissing || product.readiness?.state === 'missing_artwork') {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: WORKFLOW_STATUS.blocked,
      tone: 'red',
      detail: artworkMissing || 'Artwork is required.',
      satisfied: false,
      overrideAllowed: true,
    });
  }
  return requirementState({
    key: REQUIREMENT_KEYS.artwork,
    label: 'Artwork',
    status: WORKFLOW_STATUS.waiting,
    tone: 'orange',
    detail: 'Not received or pending confirmation',
    satisfied: false,
    overrideAllowed: true,
  });
}

function activationInformationRequirement(record, { client } = {}) {
  if (!activationApplies(record, client)) {
    return requirementState({
      key: REQUIREMENT_KEYS.activationInformation,
      label: 'Activation Information',
      status: WORKFLOW_STATUS.notApplicable,
      tone: 'neutral',
      detail: 'Not applicable to this workflow or client',
      satisfied: true,
      overrideAllowed: false,
      applicable: false,
    });
  }
  const activation = referenceValueFor(record, ['activation', 'campaign']);
  if (activation) {
    return requirementState({
      key: REQUIREMENT_KEYS.activationInformation,
      label: 'Activation Information',
      status: WORKFLOW_STATUS.complete,
      tone: 'green',
      detail: `Complete: ${activation}`,
      satisfied: true,
      overrideAllowed: false,
    });
  }
  if (!record?.linkedItem) {
    return requirementState({
      key: REQUIREMENT_KEYS.activationInformation,
      label: 'Activation Information',
      status: WORKFLOW_STATUS.blocked,
      tone: 'red',
      detail: 'Product information is required first',
      satisfied: false,
      overrideAllowed: false,
    });
  }
  return requirementState({
    key: REQUIREMENT_KEYS.activationInformation,
    label: 'Activation Information',
    status: WORKFLOW_STATUS.waiting,
    tone: 'orange',
    detail: 'Waiting for campaign assignment',
    satisfied: false,
    overrideAllowed: false,
  });
}

export function evaluateMerchandiseReviewRequirements(record, { artworkOverride, client } = {}) {
  const baseRequirements = [
    merchandiseVerifiedRequirement(record),
    deliverablesRequirement(record),
  ];
  if (isThr3dOnly(record)) return baseRequirements;
  const photoDeliverables = selectedPhotoDeliverables(record);
  if (!photoDeliverables.length) return baseRequirements;
  const photoRequirements = [productInformationRequirement(record)];
  if (photoDeliverables.includes('Ecomm Photo')) {
    photoRequirements.push(artworkRequirement(record, { artworkOverride, client }));
    photoRequirements.push(activationInformationRequirement(record, { client }));
  }
  if (photoDeliverables.includes('Packaging Photo')) {
    photoRequirements.push(artworkRequirement(record, { artworkOverride, client }));
  }
  const byKey = {};
  [...baseRequirements, ...photoRequirements].forEach(requirement => {
    if (!byKey[requirement.key] || (!requirement.satisfied && byKey[requirement.key].satisfied)) {
      byKey[requirement.key] = requirement;
    }
  });
  return Object.values(byKey);
}

function isThr3dRecord(record) {
  const product = record?.linkedItem || {};
  return [
    record?.merchStatus,
    record?.notes,
    record?.primaryWorkstream,
    product.workstream,
    product.output,
    product.status,
    product.referenceDataRaw,
  ].some(value => textIncludes(value, ['thr3d', 'thread', '3d']));
}

export function workstreamFromLegacyValue(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (['ecomm-photo', 'ecomm photo', 'ecommerce photo', 'gs1-ecomm', 'gs1 ecomm', 'gs1', 'photo only', 'photo + render', 'photography', 'styled photography'].includes(text)) return WORKSTREAM_IDS.ecommPhoto;
  if (['packaging-photo', 'packaging photo', 'packaging-photography', 'packaging photography', 'packaging'].includes(text)) return WORKSTREAM_IDS.packagingPhoto;
  if (['thr3d', 'thread', 'thr3d scan', '3d', 'render only', 'thr3d-scan'].includes(text)) return WORKSTREAM_IDS.thr3d;
  return WORKSTREAMS.find(workstream => workstream.id === value || workstream.label.toLowerCase() === text)?.id || '';
}

export function workstreamLabel(workstreamId) {
  return WORKSTREAMS.find(workstream => workstream.id === workstreamId)?.label || '';
}

export function workstreamDefinition(workstreamId, registry = WORKSTREAMS) {
  return registry.find(workstream => workstream.id === workstreamId || workstream.key === workstreamId) || null;
}

export function activeWorkstreamsForClient(clientId, registry = WORKSTREAMS, clientAvailability = {}) {
  const allowed = clientAvailability?.[clientId];
  return registry.filter(workstream => workstream.active !== false && (!Array.isArray(allowed) || allowed.includes(workstream.id || workstream.key)));
}

export function workOrderPreview(workstreamIds = [], registry = WORKSTREAMS, workflow = MERCHANDISE_REVIEW_WORKFLOW) {
  const firstGate = gateById(workflow, GATE_IDS.newReview);
  return workstreamIds
    .map(workstreamId => workstreamDefinition(workstreamId, registry))
    .filter(Boolean)
    .map(workstream => ({
      workstreamId: workstream.id || workstream.key,
      label: workstream.label,
      workflowTemplate: workstream.workflowTemplate,
      workflowName: workstream.workflowName || workstream.workflowTemplate || workflow.name,
      initialGate: workstream.initialGate || firstGate.id,
      initialGateName: firstGate.label,
      requiredReviewData: workstream.requiredReviewData || [],
    }));
}

export const workstreamAssignmentPreview = workOrderPreview;

function requirementByKey(requirements, key) {
  return requirements.find(requirement => requirement.key === key) || {};
}

export function workflowForClient(clientId, registry = WORKFLOW_REGISTRY) {
  const workflowId = registry.clientWorkflowAssignments?.[clientId] || registry.defaultWorkflowId;
  return registry.workflows?.[workflowId] || registry.workflows?.[registry.defaultWorkflowId] || MERCHANDISE_REVIEW_WORKFLOW;
}

export function gatesForBoard(workflow = MERCHANDISE_REVIEW_WORKFLOW) {
  return [...workflow.gates]
    .filter(gateConfig => gateConfig.boardVisible !== false && gateConfig.visible !== false)
    .sort((a, b) => a.order - b.order);
}

export function workspaceModeForGate(gateConfig) {
  return gateConfig?.workspaceMode || WORKSPACE_MODES.drawer;
}

export function gateById(workflow, gateId) {
  return workflow.gates.find(item => item.id === gateId) || workflow.gates[0];
}

export function deriveMerchandiseReviewGate(record, requirements, requestedGateId, reviewState, workflow = MERCHANDISE_REVIEW_WORKFLOW) {
  const visibleGateIds = new Set(gatesForBoard(workflow).map(gateConfig => gateConfig.id));
  if (requestedGateId && visibleGateIds.has(requestedGateId)) return requestedGateId;
  if ((reviewState === 'Validated' || record?.intakeStatus === 'Ready to Release') && visibleGateIds.has(GATE_IDS.readyProduction)) return GATE_IDS.readyProduction;
  if (record?.intakeStatus === 'Waiting on Information' && visibleGateIds.has(GATE_IDS.waitingInformation)) return GATE_IDS.waitingInformation;
  return visibleGateIds.has(GATE_IDS.newReview) ? GATE_IDS.newReview : [...visibleGateIds][0];
}

export function createWorkflowAssignment({ workflow = MERCHANDISE_REVIEW_WORKFLOW, record, gateId, requirements, owner, workstream, persistedAssignment } = {}) {
  const gateConfig = gateById(workflow, gateId);
  const workflowTemplate = workstream?.workflowTemplate || persistedAssignment?.workflowId || workflow.id;
  return {
    id: persistedAssignment?.id || `${record?.id || 'merchandise'}:${workstream?.id || workstream?.key || 'unassigned'}`,
    workflowId: workflowTemplate,
    workflowName: workstream?.workflowName || persistedAssignment?.workflowName || workflowTemplate || workflow.name,
    subjectType: workstream ? 'work-order' : 'merchandise',
    subjectId: persistedAssignment?.id || record?.id || '',
    merchandiseId: record?.id || '',
    workstreamId: workstream?.id || workstream?.key || persistedAssignment?.workstreamKey || '',
    workstream,
    currentGate: gateConfig.id,
    currentGateName: gateConfig.label || gateConfig.displayName,
    currentOwner: owner || gateConfig.ownerRole || gateConfig.owner || workflow.owner,
    currentStatus: persistedAssignment?.currentStatus || gateConfig.status || WORKFLOW_STATUS.notStarted,
    gate: gateConfig,
    requirements,
    availableActions: gateConfig.actions || [],
    allowedNextGates: gateConfig.allowedNextGates || [],
    reason: assignmentReason(gateConfig.id, requirements, record),
    validNextGates: [],
    blockedNextGates: [],
  };
}

function assignmentReason(gateId, requirements, record) {
  if (gateId === GATE_IDS.sendThr3d) return 'Thr3d is selected and this belongs in the Thr3d shipping path.';
  const blockers = requirements.filter(requirement => requirement.visible !== false && !requirement.satisfied);
  if (gateId === GATE_IDS.waitingInformation) return blockers.length ? `Still needed: ${blockers.map(item => item.label).join(', ')}.` : 'Waiting on a client answer.';
  if (gateId === GATE_IDS.waitingActivation) return 'PM is actively working this card.';
  if (gateId === GATE_IDS.readyProduction) return 'All required information for photography is complete.';
  if (record?.reviewState) return `Existing review state: ${record.reviewState}.`;
  return 'New merchandise is ready for a PM to pick up.';
}

export function validateWorkflowTransition(workflow, assignment, destinationGateId) {
  const gateConfig = gateById(workflow, destinationGateId);
  if (!gateConfig || gateConfig.id !== destinationGateId) {
    return { allowed: false, message: 'Cannot move to an unknown workflow gate.', missing: [] };
  }
  if (assignment.currentGate === destinationGateId) {
    return { allowed: false, message: 'This merchandise is already in that gate.', missing: [] };
  }
  if (assignment.allowedNextGates?.length && !assignment.allowedNextGates.includes(destinationGateId)) {
    return {
      allowed: false,
      message: `Cannot move to ${gateConfig.label}. This is not an allowed next gate from ${assignment.currentGateName}.`,
      missing: [],
    };
  }
  const missing = (gateConfig.entryCriteria || gateConfig.requiredData || [])
    .map(key => requirementByKey(assignment.requirements || [], key))
    .filter(requirement => requirement.visible !== false && !requirement.satisfied)
    .map(requirement => requirement.label || requirement.key);

  return {
    allowed: missing.length === 0,
    message: missing.length ? `Cannot move to ${gateConfig.label}.\nMissing: ${missing.join(', ')}` : '',
    missing,
  };
}

export function enrichWorkflowAssignment(workflow, assignment) {
  const candidates = gatesForBoard(workflow).filter(gateConfig => gateConfig.id !== assignment.currentGate);
  const validNextGates = [];
  const blockedNextGates = [];
  candidates.forEach(gateConfig => {
    const validation = validateWorkflowTransition(workflow, assignment, gateConfig.id);
    const entry = { gate: gateConfig, ...validation };
    if (validation.allowed) validNextGates.push(entry);
    else blockedNextGates.push(entry);
  });
  return { ...assignment, validNextGates, blockedNextGates };
}

export const enrichWorkOrder = enrichWorkflowAssignment;

export function evaluateMerchandiseReviewAssignment(record, { artworkOverride, requestedGateId, reviewState, client, workflow } = {}) {
  const activeWorkflow = workflow || MERCHANDISE_REVIEW_WORKFLOW;
  const requirements = evaluateMerchandiseReviewRequirements(record, { artworkOverride, client });
  const gateId = deriveMerchandiseReviewGate(record, requirements, requestedGateId, reviewState, activeWorkflow);
  return enrichWorkflowAssignment(activeWorkflow, createWorkflowAssignment({ workflow: activeWorkflow, record, gateId, requirements }));
}

export function evaluateWorkstreamAssignment(record, { workstream, persistedAssignment, artworkOverride, requestedGateId, reviewState, client, workflow } = {}) {
  const activeWorkflow = workflow || MERCHANDISE_REVIEW_WORKFLOW;
  const requirements = evaluateMerchandiseReviewRequirements(record, { artworkOverride, client, workstream });
  const gateId = persistedAssignment?.currentGate || requestedGateId || deriveMerchandiseReviewGate(record, requirements, '', reviewState, activeWorkflow);
  return enrichWorkflowAssignment(activeWorkflow, createWorkflowAssignment({
    workflow: activeWorkflow,
    record,
    gateId,
    requirements,
    workstream,
    persistedAssignment,
  }));
}

export const evaluateWorkOrder = evaluateWorkstreamAssignment;

export function buildMerchandiseWorkflowCard(record, { assignment, client, location } = {}) {
  const product = record?.linkedItem || {};
  const primaryWorkstream = assignment.gate?.workstream
    || assignment.workstreamId
    || workstreamFromLegacyValue(record?.primaryWorkstream)
    || workstreamFromLegacyValue(product.workstream)
    || workstreamFromLegacyValue(product.output);
  return {
    id: assignment.id || record.id,
    merchandiseId: record.id,
    record,
    assignment,
    workOrder: assignment,
    readiness: assignment.requirements,
    columnId: assignment.currentGate,
    title: record.productName || record.linkedItem?.product || record.linkedItem?.name || 'Unidentified Merchandise',
    client: client?.name || 'Unknown client',
    identifier: record.skuId || record.linkedItem?.identifier || record.linkedItem?.productId || '',
    location: location?.name || '',
    timeHere: record.timeHere || 'Unknown',
    quantity: record.quantity || 1,
    issueBadge: record.reviewState === 'Issue' || record.merchStatus === 'Issue' || record.blockingIssues?.length ? 'Issue' : '',
    statusBadge: record.reviewState === 'Validated' || record.merchStatus === 'Validated' ? 'Validated' : '',
    primaryWorkstream,
    workstream: assignment.workstream?.label || workstreamLabel(primaryWorkstream) || product.workstream || product.output || '',
  };
}

export const buildWorkOrderCard = buildMerchandiseWorkflowCard;

export function routingPreviewForWorkstream(workstreamId = '') {
  const selected = WORKSTREAMS.find(workstream => workstream.id === workstreamId);
  if (!selected) {
    return {
      label: 'No workstream selected',
      routes: [],
      detail: 'Choose a primary workstream before release decisions are made.',
    };
  }
  if (selected.id === WORKSTREAM_IDS.thr3d) {
    return {
      label: 'THR3D workflow',
      routes: [selected.workflowTemplate],
      detail: 'THR3D is selected, so future routing should use the THR3D workflow.',
    };
  }
  if ([WORKSTREAM_IDS.ecommPhoto, WORKSTREAM_IDS.packagingPhoto].includes(selected.id)) {
    return {
      label: `${selected.label} workflow`,
      routes: [selected.workflowTemplate],
      detail: `${selected.label} is selected, so future routing should use the ${selected.workflowName || selected.workflowTemplate} workflow.`,
    };
  }
  return {
    label: 'Manual routing review',
    routes: [selected.workflowTemplate],
    detail: `${selected.label} is reserved for future workflow routing.`,
  };
}
