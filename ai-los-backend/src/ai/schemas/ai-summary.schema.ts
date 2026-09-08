export const aiSummarySchema = {
  type: 'object',

  properties: {
    facts: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    missing: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    inconsistencies: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    risks: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    sourceReferences: {
      type: 'array',
      items: {
        type: 'string',
      },
    },

    summary: {
      type: 'string',
    },
  },

  required: [
    'facts',
    'missing',
    'inconsistencies',
    'risks',
    'sourceReferences',
    'summary',
  ],

  additionalProperties: false,
} as const;