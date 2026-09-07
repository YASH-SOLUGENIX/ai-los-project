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

    summary: {
      type: 'string',
    },
  },

  required: [
    'facts',
    'missing',
    'inconsistencies',
    'summary',
  ],

  additionalProperties: false,
} as const;