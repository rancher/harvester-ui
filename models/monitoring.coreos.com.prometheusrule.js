export default {
  // if not a function it does exist, why?
  customValidationRules() {
    return [
      {
        nullable:       false,
        path:           'metadata.name',
        required:       true,
        translationKey: 'generic.name',
        type:           'dnsLabel',
      },
      {
        nullable:   false,
        path:       'spec',
        required:   true,
        type:       'array',
        validators: ['ruleGroups'],
      },
      {
        nullable:   false,
        path:       'spec.groups',
        required:   true,
        type:       'array',
        validators: ['groupsAreValid'],
      },
    ];
  },
};
