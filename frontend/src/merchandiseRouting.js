export const PLANNING_OWNERS = {
  shipments: 'Shipments',
  receiving: 'Shipments',
  projectManagement: 'Project Management',
  creativeForce: 'Creative Force',
  delivery: 'Delivery',
};

export const REQUIREMENT_STATUS = {
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

export const DELIVERABLE_ROUTE_IDS = {
  ecommPhoto: 'ecomm-photo',
  packagingPhoto: 'packaging-photo',
  thr3d: 'thr3d',
};

export const DELIVERABLE_ROUTES = [
  {
    id: DELIVERABLE_ROUTE_IDS.ecommPhoto,
    label: 'Ecomm',
    description: 'Ecommerce photography deliverable.',
    active: true,
    planningTemplate: 'ecomm-review',
    planningName: 'Ecomm Review',
    initialQueue: 'new-review',
    requiredReviewData: ['product-information', 'artwork', 'activation-information'],
    jobRequired: false,
    producerRequired: false,
    schedulingRequired: false,
    externalDestination: 'Creative Force',
  },
  {
    id: DELIVERABLE_ROUTE_IDS.packagingPhoto,
    label: 'Packaging',
    description: 'Packaging photography deliverable.',
    active: true,
    planningTemplate: 'packaging-review',
    planningName: 'Packaging Review',
    initialQueue: 'new-review',
    requiredReviewData: ['product-information', 'producer-preproduction'],
    jobRequired: false,
    producerRequired: true,
    schedulingRequired: true,
    externalDestination: 'Creative Force',
  },
  {
    id: DELIVERABLE_ROUTE_IDS.thr3d,
    label: 'Thr3d',
    description: 'Thr3d outbound shipment path.',
    active: true,
    planningTemplate: 'thr3d-review',
    planningName: 'Thr3d Review',
    initialQueue: 'new-review',
    requiredReviewData: ['product-information', 'thr3d-routing'],
    jobRequired: false,
    producerRequired: false,
    schedulingRequired: false,
    externalDestination: 'Shipments Outgoing',
  },
];

export const REQUIREMENT_KEYS = {
  merchandiseVerified: 'merchandise-verified',
  productInformation: 'product-information',
  deliverables: 'deliverables',
  artwork: 'artwork',
  activationInformation: 'activation-information',
};

export const QUEUE_IDS = {
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

export const BOARD_IDS = {
  planning: 'planning',
  production: 'production',
};

export const BOARD_STATE_MODEL = {
  [BOARD_IDS.planning]: {
    id: BOARD_IDS.planning,
    label: 'Planning Board',
    owner: PLANNING_OWNERS.projectManagement,
    owns: [QUEUE_IDS.newReview, QUEUE_IDS.waitingActivation, QUEUE_IDS.waitingInformation],
    shared: [QUEUE_IDS.readyProduction],
    columns: [QUEUE_IDS.newReview, QUEUE_IDS.waitingActivation, QUEUE_IDS.waitingInformation, QUEUE_IDS.readyProduction],
  },
  [BOARD_IDS.production]: {
    id: BOARD_IDS.production,
    label: 'Production Board',
    owner: 'Production',
    owns: [QUEUE_IDS.productionScheduled, QUEUE_IDS.productionInProgress, QUEUE_IDS.productionQc, QUEUE_IDS.productionComplete],
    shared: [QUEUE_IDS.readyProduction],
    columns: [
      QUEUE_IDS.readyProduction,
      QUEUE_IDS.productionScheduled,
      QUEUE_IDS.productionInProgress,
      QUEUE_IDS.productionQc,
      QUEUE_IDS.productionComplete,
    ],
  },
};

export const WORKSPACE_SECTIONS = {
  merchandiseObservations: 'merchandise-observations',
  photos: 'photos',
  productIdentification: 'product-identification',
  productIdentificationSummary: 'product-identification-summary',
  deliverables: 'deliverables',
  missingInformation: 'missing-information',
  artwork: 'artwork',
  artworkSummary: 'artwork-summary',
  activation: 'activation',
  notes: 'notes',
  thr3dRouting: 'thr3d-routing',
  shipment: 'shipment',
  issues: 'issues',
  history: 'history',
  requiredToShoot: 'required-to-shoot',
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
  requiredToShoot: 'requiredToShoot',
};

function queueColumn({
  id,
  label,
  description,
  order,
  visible = true,
  ownerRole = PLANNING_OWNERS.projectManagement,
  entryCriteria = [],
  exitCriteria = [],
  allowedNextQueues = [],
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
    CARD_FIELDS.requiredToShoot,
  ],
  workspaceSections = [],
  deliverableRoute = '',
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
    allowedNextQueues,
    transitionMode,
    workspaceMode,
    cardFields,
    workspaceSections,
    deliverableRoute,
  };
}

export const MERCHANDISE_PLANNING_BOARD = {
  id: 'merchandise-review',
  name: 'Planning Board',
  owner: PLANNING_OWNERS.projectManagement,
  defaultFor: 'merchandise-review',
  description: 'A PM-owned planning board for resolving what is required to shoot before production accepts the work.',
  queues: [
    queueColumn({
      id: QUEUE_IDS.newReview,
      label: 'New',
      description: 'Newly received merchandise awaiting PM verification.',
      order: 10,
      exitCriteria: [REQUIREMENT_KEYS.merchandiseVerified],
      allowedNextQueues: [QUEUE_IDS.waitingInformation, QUEUE_IDS.sendThr3d, QUEUE_IDS.waitingActivation, QUEUE_IDS.readyProduction],
      workspaceMode: WORKSPACE_MODES.modal,
      workspaceSections: [
        WORKSPACE_SECTIONS.merchandiseObservations,
        WORKSPACE_SECTIONS.photos,
        WORKSPACE_SECTIONS.productIdentification,
        WORKSPACE_SECTIONS.deliverables,
        WORKSPACE_SECTIONS.requiredToShoot,
      ],
    }),
    queueColumn({
      id: QUEUE_IDS.waitingInformation,
      label: 'Waiting',
      description: 'PM-owned queue for client answers, files, or decisions.',
      order: 20,
      exitCriteria: [REQUIREMENT_KEYS.productInformation, REQUIREMENT_KEYS.artwork, REQUIREMENT_KEYS.activationInformation],
      allowedNextQueues: [QUEUE_IDS.newReview, QUEUE_IDS.sendThr3d, QUEUE_IDS.waitingActivation, QUEUE_IDS.readyProduction],
      workspaceSections: [
        WORKSPACE_SECTIONS.missingInformation,
        WORKSPACE_SECTIONS.productIdentification,
        WORKSPACE_SECTIONS.artwork,
        WORKSPACE_SECTIONS.activation,
        WORKSPACE_SECTIONS.notes,
        WORKSPACE_SECTIONS.requiredToShoot,
      ],
    }),
    queueColumn({
      id: QUEUE_IDS.sendThr3d,
      label: 'Thr3d Shipment',
      description: 'Verified merchandise ready for Shipments Outgoing.',
      order: 30,
      entryCriteria: [REQUIREMENT_KEYS.merchandiseVerified, REQUIREMENT_KEYS.deliverables],
      exitCriteria: [REQUIREMENT_KEYS.merchandiseVerified, REQUIREMENT_KEYS.deliverables],
      allowedNextQueues: [QUEUE_IDS.waitingActivation, QUEUE_IDS.readyProduction],
      workspaceSections: [
        WORKSPACE_SECTIONS.merchandiseObservations,
        WORKSPACE_SECTIONS.photos,
        WORKSPACE_SECTIONS.productIdentification,
        WORKSPACE_SECTIONS.deliverables,
        WORKSPACE_SECTIONS.thr3dRouting,
        WORKSPACE_SECTIONS.requiredToShoot,
      ],
      deliverableRoute: DELIVERABLE_ROUTE_IDS.thr3d,
    }),
    queueColumn({
      id: QUEUE_IDS.waitingActivation,
      label: 'Planning',
      description: 'PM-controlled planning queue.',
      order: 40,
      entryCriteria: [REQUIREMENT_KEYS.productInformation, REQUIREMENT_KEYS.artwork],
      exitCriteria: [REQUIREMENT_KEYS.activationInformation],
      allowedNextQueues: [QUEUE_IDS.readyProduction],
      workspaceSections: [
        WORKSPACE_SECTIONS.productIdentificationSummary,
        WORKSPACE_SECTIONS.artworkSummary,
        WORKSPACE_SECTIONS.activation,
        WORKSPACE_SECTIONS.issues,
        WORKSPACE_SECTIONS.requiredToShoot,
      ],
    }),
    queueColumn({
      id: QUEUE_IDS.readyProduction,
      label: 'Awaiting Photo Release',
      description: 'Ready work waiting for the final photo release.',
      order: 50,
      workspaceMode: WORKSPACE_MODES.readonly,
      entryCriteria: [
        REQUIREMENT_KEYS.merchandiseVerified,
        REQUIREMENT_KEYS.productInformation,
        REQUIREMENT_KEYS.deliverables,
      ],
      allowedNextQueues: [],
      workspaceSections: [
        WORKSPACE_SECTIONS.merchandiseSummary,
        WORKSPACE_SECTIONS.productSummary,
        WORKSPACE_SECTIONS.deliverables,
        WORKSPACE_SECTIONS.requiredToShoot,
        WORKSPACE_SECTIONS.history,
      ],
    }),
  ],
};

export const PLANNING_BOARD_REGISTRY = {
  defaultBoardId: MERCHANDISE_PLANNING_BOARD.id,
  boards: {
    [MERCHANDISE_PLANNING_BOARD.id]: MERCHANDISE_PLANNING_BOARD,
  },
  clientBoardAssignments: {},
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
  if (status === REQUIREMENT_STATUS.complete) return 'Complete';
  if (status === REQUIREMENT_STATUS.blocked) return 'Missing';
  if (status === REQUIREMENT_STATUS.waiting) return 'Pending';
  if (status === REQUIREMENT_STATUS.notApplicable) return 'Not applicable';
  return 'Needs attention';
}

function missingProductReasons(record) {
  const product = record?.linkedItem || null;
  const requiredToShoot = product?.requiredToShoot || {};
  const missing = requiredToShoot.missing || [];
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
      status: record?.linkedItem ? REQUIREMENT_STATUS.waiting : REQUIREMENT_STATUS.blocked,
      tone: record?.linkedItem ? 'orange' : 'red',
      detail: reasons.join(', '),
      satisfied: false,
      overrideAllowed: false,
    });
  }
  const warnings = product.requiredToShoot?.warnings || [];
  return requirementState({
    key: REQUIREMENT_KEYS.productInformation,
    label: 'Product Information',
    status: warnings.length ? REQUIREMENT_STATUS.waiting : REQUIREMENT_STATUS.complete,
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
  return deliverableValues(record).filter(value => value === 'Packaging' || value === 'Ecomm');
}

function isThr3dOnly(record) {
  const deliverables = deliverableValues(record);
  return deliverables.length === 1 && deliverables[0] === 'Thr3d';
}

function positiveQuantity(value) {
  return Number(value) > 0;
}

function hasMerchandisePhoto(record) {
  const itemPhotos = Array.isArray(record?.itemPhotos) ? record.itemPhotos : [];
  const metadata = Array.isArray(record?.photoMetadata) ? record.photoMetadata : [];
  const photos = Array.isArray(record?.photos) ? record.photos : [];
  return [...itemPhotos, ...metadata, ...photos].some(photo => photo && (photo.object_key || photo.objectKey || photo.url || photo.public_url || photo.publicUrl));
}

function clientRequirement(record) {
  const clientIds = Array.isArray(record?.clientIds) ? record.clientIds : [];
  return requirementState({
    key: 'client',
    label: 'Client',
    status: clientIds.length || record?.client ? REQUIREMENT_STATUS.complete : REQUIREMENT_STATUS.blocked,
    tone: clientIds.length || record?.client ? 'green' : 'red',
    detail: clientIds.length || record?.client ? 'Complete' : 'Select a Client.',
    satisfied: Boolean(clientIds.length || record?.client),
    overrideAllowed: false,
  });
}

function merchandisePhotoRequirement(record) {
  const hasPhoto = hasMerchandisePhoto(record);
  return requirementState({
    key: 'merchandise-photo',
    label: 'Merchandise Photo',
    status: hasPhoto ? REQUIREMENT_STATUS.complete : REQUIREMENT_STATUS.blocked,
    tone: hasPhoto ? 'green' : 'red',
    detail: hasPhoto ? 'Complete' : 'Add at least one merchandise photo.',
    satisfied: hasPhoto,
    overrideAllowed: false,
  });
}

function quantityRequirement(record) {
  const hasQuantity = positiveQuantity(record?.quantity);
  return requirementState({
    key: 'quantity',
    label: 'Quantity',
    status: hasQuantity ? REQUIREMENT_STATUS.complete : REQUIREMENT_STATUS.blocked,
    tone: hasQuantity ? 'green' : 'red',
    detail: hasQuantity ? 'Complete' : 'Add Quantity.',
    satisfied: hasQuantity,
    overrideAllowed: false,
  });
}

function merchandiseVerifiedRequirement(record) {
  const hasIssue = record?.reviewState === 'Issue' || record?.merchStatus === 'Issue' || Boolean(record?.blockingIssues?.length);
  const verified = Boolean(record?.merchandiseVerified) && !hasIssue;
  return requirementState({
    key: REQUIREMENT_KEYS.merchandiseVerified,
    label: 'Merchandise Verified',
    status: verified ? REQUIREMENT_STATUS.complete : REQUIREMENT_STATUS.blocked,
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
    status: deliverables.length ? REQUIREMENT_STATUS.complete : REQUIREMENT_STATUS.blocked,
    tone: deliverables.length ? 'green' : 'red',
    detail: deliverables.length ? deliverables.join(', ') : 'Choose Packaging, Ecomm, Thr3d, or a combination.',
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
      status: REQUIREMENT_STATUS.notApplicable,
      tone: 'neutral',
      detail: 'Not applicable to these deliverables or client',
      satisfied: true,
      overrideAllowed: true,
      applicable: false,
    });
  }
  if (artworkOverride) {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: REQUIREMENT_STATUS.complete,
      tone: 'green',
      detail: `${artworkOverride.status === 'not-required' ? 'Not required' : 'Approved to proceed'} by ${artworkOverride.user || 'PM'}: ${artworkOverride.reason}`,
      satisfied: true,
      overrideAllowed: true,
      overridden: true,
    });
  }
  const product = record?.linkedItem || {};
  const missing = product.requiredToShoot?.missing || [];
  const artworkMissing = missing.find(item => /artwork/i.test(item));
  if (product.artworkReceived) {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: REQUIREMENT_STATUS.complete,
      tone: 'green',
      detail: 'Complete',
      satisfied: true,
      overrideAllowed: true,
    });
  }
  if (artworkMissing || product.requiredToShoot?.state === 'missing_artwork') {
    return requirementState({
      key: REQUIREMENT_KEYS.artwork,
      label: 'Artwork',
      status: REQUIREMENT_STATUS.blocked,
      tone: 'red',
      detail: artworkMissing || 'Artwork is required.',
      satisfied: false,
      overrideAllowed: true,
    });
  }
  return requirementState({
    key: REQUIREMENT_KEYS.artwork,
    label: 'Artwork',
    status: REQUIREMENT_STATUS.waiting,
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
      status: REQUIREMENT_STATUS.notApplicable,
      tone: 'neutral',
      detail: 'Not applicable to these deliverables or client',
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
      status: REQUIREMENT_STATUS.complete,
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
      status: REQUIREMENT_STATUS.blocked,
      tone: 'red',
      detail: 'Product information is required first',
      satisfied: false,
      overrideAllowed: false,
    });
  }
  return requirementState({
    key: REQUIREMENT_KEYS.activationInformation,
    label: 'Activation Information',
    status: REQUIREMENT_STATUS.waiting,
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
  if (isThr3dOnly(record)) {
    return [
      clientRequirement(record),
      merchandisePhotoRequirement(record),
      quantityRequirement(record),
      deliverablesRequirement(record),
    ];
  }
  const photoDeliverables = selectedPhotoDeliverables(record);
  if (!photoDeliverables.length) return baseRequirements;
  const photoRequirements = [productInformationRequirement(record)];
  if (photoDeliverables.includes('Ecomm')) {
    photoRequirements.push(artworkRequirement(record, { artworkOverride, client }));
    photoRequirements.push(activationInformationRequirement(record, { client }));
  }
  if (photoDeliverables.includes('Packaging')) {
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
    record?.primaryDeliverableRoute,
    product.deliverableRoute,
    product.output,
    product.status,
    product.referenceDataRaw,
  ].some(value => textIncludes(value, ['thr3d', 'thread', '3d']));
}

export function deliverableRouteFromLegacyValue(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return '';
  if (['ecomm-photo', 'ecomm photo', 'ecommerce photo', 'gs1-ecomm', 'gs1 ecomm', 'gs1', 'photo only', 'photo + render', 'photography', 'styled photography'].includes(text)) return DELIVERABLE_ROUTE_IDS.ecommPhoto;
  if (['packaging-photo', 'packaging photo', 'packaging-photography', 'packaging photography', 'packaging'].includes(text)) return DELIVERABLE_ROUTE_IDS.packagingPhoto;
  if (['thr3d', 'thread', 'thr3d scan', '3d', 'render only', 'thr3d-scan'].includes(text)) return DELIVERABLE_ROUTE_IDS.thr3d;
  return DELIVERABLE_ROUTES.find(deliverableRoute => deliverableRoute.id === value || deliverableRoute.label.toLowerCase() === text)?.id || '';
}

export function deliverableRouteLabel(deliverableRouteId) {
  return DELIVERABLE_ROUTES.find(deliverableRoute => deliverableRoute.id === deliverableRouteId)?.label || '';
}

export function deliverableRouteDefinition(deliverableRouteId, registry = DELIVERABLE_ROUTES) {
  return registry.find(deliverableRoute => deliverableRoute.id === deliverableRouteId || deliverableRoute.key === deliverableRouteId) || null;
}

export function activeDeliverableRoutesForClient(clientId, registry = DELIVERABLE_ROUTES, clientAvailability = {}) {
  const allowed = clientAvailability?.[clientId];
  return registry.filter(deliverableRoute => deliverableRoute.active !== false && (!Array.isArray(allowed) || allowed.includes(deliverableRoute.id || deliverableRoute.key)));
}

export function planningRoutePreview(deliverableRouteIds = [], registry = DELIVERABLE_ROUTES, planningBoard = MERCHANDISE_PLANNING_BOARD) {
  const firstQueue = queueById(planningBoard, QUEUE_IDS.newReview);
  return deliverableRouteIds
    .map(deliverableRouteId => deliverableRouteDefinition(deliverableRouteId, registry))
    .filter(Boolean)
    .map(deliverableRoute => ({
      deliverableRouteId: deliverableRoute.id || deliverableRoute.key,
      label: deliverableRoute.label,
      planningTemplate: deliverableRoute.planningTemplate,
      planningName: deliverableRoute.planningName || deliverableRoute.planningTemplate || planningBoard.name,
      initialQueue: deliverableRoute.initialQueue || firstQueue.id,
      initialQueueName: firstQueue.label,
      requiredReviewData: deliverableRoute.requiredReviewData || [],
    }));
}

export const deliverableRoutePreview = planningRoutePreview;

function requirementByKey(requirements, key) {
  return requirements.find(requirement => requirement.key === key) || {};
}

export function planningBoardForClient(clientId, registry = PLANNING_BOARD_REGISTRY) {
  const planningBoardId = registry.clientBoardAssignments?.[clientId] || registry.defaultBoardId;
  return registry.boards?.[planningBoardId] || registry.boards?.[registry.defaultBoardId] || MERCHANDISE_PLANNING_BOARD;
}

export function queuesForBoard(planningBoard = MERCHANDISE_PLANNING_BOARD) {
  const queues = Array.isArray(planningBoard?.queues) && planningBoard.queues.length
    ? planningBoard.queues
    : MERCHANDISE_PLANNING_BOARD.queues;
  return [...queues]
    .filter(queueConfig => queueConfig.boardVisible !== false && queueConfig.visible !== false)
    .sort((a, b) => a.order - b.order);
}

export function workspaceModeForQueue(queueConfig) {
  return queueConfig?.workspaceMode || WORKSPACE_MODES.drawer;
}

export function queueById(planningBoard, queueId) {
  const queues = queuesForBoard(planningBoard);
  return queues.find(item => item.id === queueId)
    || queues.find(item => item.id === QUEUE_IDS.newReview)
    || MERCHANDISE_PLANNING_BOARD.queues.find(item => item.id === queueId)
    || MERCHANDISE_PLANNING_BOARD.queues.find(item => item.id === QUEUE_IDS.newReview);
}

export function deriveMerchandiseReviewQueue(record, requirements, requestedQueueId, reviewState, planningBoard = MERCHANDISE_PLANNING_BOARD) {
  const visibleQueueIds = new Set(queuesForBoard(planningBoard).map(queueConfig => queueConfig.id));
  if (requestedQueueId && visibleQueueIds.has(requestedQueueId)) return requestedQueueId;
  if (record?.planningStatus === 'awaiting-photo-release' && visibleQueueIds.has(QUEUE_IDS.readyProduction)) return QUEUE_IDS.readyProduction;
  if (record?.planningStatus === 'needs-more-information' && visibleQueueIds.has(QUEUE_IDS.waitingInformation)) return QUEUE_IDS.waitingInformation;
  return visibleQueueIds.has(QUEUE_IDS.newReview) ? QUEUE_IDS.newReview : [...visibleQueueIds][0];
}

export function createPlanningCard({ planningBoard = MERCHANDISE_PLANNING_BOARD, record, queueId, requirements, owner, deliverableRoute, persistedAssignment } = {}) {
  const queueConfig = queueById(planningBoard, queueId);
  const activeBoard = planningBoard?.id ? planningBoard : MERCHANDISE_PLANNING_BOARD;
  const planningTemplate = deliverableRoute?.planningTemplate || persistedAssignment?.planningBoardId || activeBoard.id;
  return {
    id: persistedAssignment?.id || `${record?.id || 'merchandise'}:${deliverableRoute?.id || deliverableRoute?.key || 'unassigned'}`,
    planningBoardId: planningTemplate,
    planningName: deliverableRoute?.planningName || persistedAssignment?.planningName || planningTemplate || activeBoard.name,
    subjectType: deliverableRoute ? 'deliverable-route' : 'merchandise',
    subjectId: persistedAssignment?.id || record?.id || '',
    merchandiseId: record?.id || '',
    deliverableRouteId: deliverableRoute?.id || deliverableRoute?.key || '',
    deliverableRoute,
    currentQueue: queueConfig.id,
    currentQueueName: queueConfig.label || queueConfig.displayName,
    currentOwner: owner || queueConfig.ownerRole || queueConfig.owner || activeBoard.owner,
    currentStatus: persistedAssignment?.currentStatus || queueConfig.status || REQUIREMENT_STATUS.notStarted,
    queue: queueConfig,
    requirements,
    availableActions: queueConfig.actions || [],
    allowedNextQueues: queueConfig.allowedNextQueues || [],
    reason: assignmentReason(queueConfig.id, requirements, record),
    validNextQueues: [],
    blockedNextQueues: [],
  };
}

function assignmentReason(queueId, requirements, record) {
  if (queueId === QUEUE_IDS.sendThr3d) return 'Thr3d is selected and this belongs in Shipments Outgoing.';
  const blockers = requirements.filter(requirement => requirement.visible !== false && !requirement.satisfied);
  if (queueId === QUEUE_IDS.waitingInformation) return blockers.length ? `Still needed: ${blockers.map(item => item.label).join(', ')}.` : 'Waiting on a client answer.';
  if (queueId === QUEUE_IDS.waitingActivation) return 'PM is actively working this card.';
  if (queueId === QUEUE_IDS.readyProduction) return 'All required information for photography is complete.';
  if (record?.reviewState) return `Existing review state: ${record.reviewState}.`;
  return 'New merchandise is ready for a PM to pick up.';
}

export function validatePlanningMove(planningBoard, assignment, destinationQueueId) {
  const queueConfig = queueById(planningBoard, destinationQueueId);
  if (!queueConfig || queueConfig.id !== destinationQueueId) {
    return { allowed: false, message: 'Cannot move to an unknown Planning queue.', missing: [] };
  }
  if (assignment.currentQueue === destinationQueueId) {
    return { allowed: false, message: 'This merchandise is already in that queue.', missing: [] };
  }
  if (assignment.allowedNextQueues?.length && !assignment.allowedNextQueues.includes(destinationQueueId)) {
    return {
      allowed: false,
      message: `Cannot move to ${queueConfig.label}. This is not an allowed next queue from ${assignment.currentQueueName}.`,
      missing: [],
    };
  }
  const missing = (queueConfig.entryCriteria || queueConfig.requiredData || [])
    .map(key => requirementByKey(assignment.requirements || [], key))
    .filter(requirement => requirement.visible !== false && !requirement.satisfied)
    .map(requirement => requirement.label || requirement.key);

  return {
    allowed: missing.length === 0,
    message: missing.length ? `Cannot move to ${queueConfig.label}.\nMissing: ${missing.join(', ')}` : '',
    missing,
  };
}

export function enrichPlanningCard(planningBoard, assignment) {
  const candidates = queuesForBoard(planningBoard).filter(queueConfig => queueConfig.id !== assignment.currentQueue);
  const validNextQueues = [];
  const blockedNextQueues = [];
  candidates.forEach(queueConfig => {
    const validation = validatePlanningMove(planningBoard, assignment, queueConfig.id);
    const entry = { queue: queueConfig, ...validation };
    if (validation.allowed) validNextQueues.push(entry);
    else blockedNextQueues.push(entry);
  });
  return { ...assignment, validNextQueues, blockedNextQueues };
}

export const enrichPlanningCardAlias = enrichPlanningCard;

export function evaluateMerchandiseReviewAssignment(record, { artworkOverride, requestedQueueId, reviewState, client, planningBoard } = {}) {
  const activeBoard = planningBoard || MERCHANDISE_PLANNING_BOARD;
  const requirements = evaluateMerchandiseReviewRequirements(record, { artworkOverride, client });
  const queueId = deriveMerchandiseReviewQueue(record, requirements, requestedQueueId, reviewState, activeBoard);
  return enrichPlanningCard(activeBoard, createPlanningCard({ planningBoard: activeBoard, record, queueId, requirements }));
}

export function evaluateDeliverablePlanningCard(record, { deliverableRoute, persistedAssignment, artworkOverride, requestedQueueId, reviewState, client, planningBoard } = {}) {
  const activeBoard = planningBoard || MERCHANDISE_PLANNING_BOARD;
  const requirements = evaluateMerchandiseReviewRequirements(record, { artworkOverride, client, deliverableRoute });
  const queueId = persistedAssignment?.currentQueue || requestedQueueId || deriveMerchandiseReviewQueue(record, requirements, '', reviewState, activeBoard);
  return enrichPlanningCard(activeBoard, createPlanningCard({
    planningBoard: activeBoard,
    record,
    queueId,
    requirements,
    deliverableRoute,
    persistedAssignment,
  }));
}

export function buildMerchandisePlanningCard(record, { assignment, client, location } = {}) {
  const product = record?.linkedItem || {};
  const primaryDeliverableRoute = assignment.queue?.deliverableRoute
    || assignment.deliverableRouteId
    || deliverableRouteFromLegacyValue(record?.primaryDeliverableRoute)
    || deliverableRouteFromLegacyValue(product.deliverableRoute)
    || deliverableRouteFromLegacyValue(product.output);
  return {
    id: assignment.id || record.id,
    merchandiseId: record.id,
    record,
    assignment,
    planningCard: assignment,
    requiredToShoot: assignment.requirements,
    columnId: assignment.currentQueue,
    title: record.productName || record.linkedItem?.product || record.linkedItem?.name || 'Unidentified Merchandise',
    client: client?.name || 'Unknown client',
    identifier: record.skuId || record.linkedItem?.identifier || record.linkedItem?.productId || '',
    location: location?.name || '',
    timeHere: record.timeHere || 'Unknown',
    quantity: record.quantity || 1,
    issueBadge: record.reviewState === 'Issue' || record.merchStatus === 'Issue' || record.blockingIssues?.length ? 'Issue' : '',
    statusBadge: record.reviewState === 'Validated' ? 'Validated' : '',
    primaryDeliverableRoute,
    deliverableRoute: assignment.deliverableRoute?.label || deliverableRouteLabel(primaryDeliverableRoute) || product.deliverableRoute || '',
  };
}

export const buildPlanningCard = buildMerchandisePlanningCard;

export function routingPreviewForDeliverableRoute(deliverableRouteId = '') {
  const selected = DELIVERABLE_ROUTES.find(deliverableRoute => deliverableRoute.id === deliverableRouteId);
  if (!selected) {
    return {
      label: 'No deliverable selected',
      routes: [],
      detail: 'Choose Deliverables before release decisions are made.',
    };
  }
  if (selected.id === DELIVERABLE_ROUTE_IDS.thr3d) {
    return {
      label: 'THR3D shipment',
      routes: [selected.planningTemplate],
      detail: 'THR3D is selected, so future routing should appear in Shipments Outgoing.',
    };
  }
  if ([DELIVERABLE_ROUTE_IDS.ecommPhoto, DELIVERABLE_ROUTE_IDS.packagingPhoto].includes(selected.id)) {
    return {
      label: `${selected.label} route`,
      routes: [selected.planningTemplate],
      detail: `${selected.label} is selected for the Planning handoff.`,
    };
  }
  return {
    label: 'Manual routing review',
    routes: [selected.planningTemplate],
    detail: `${selected.label} is reserved for future Planning routing.`,
  };
}
