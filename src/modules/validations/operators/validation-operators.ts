export type ValidationOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_THAN_OR_EQUALS'
  | 'LESS_THAN_OR_EQUALS'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IN'
  | 'NOT_IN'
  | 'REGEX'
  | 'REQUIRED';

export function safeStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  return JSON.stringify(value);
}

export function evaluateRule(
  fieldValue: unknown,
  operator: ValidationOperator,
  ruleValue: string,
): boolean {
  const stringValue = safeStringify(fieldValue);

  switch (operator) {
    case 'EQUALS':
      return stringValue === ruleValue;

    case 'NOT_EQUALS':
      return stringValue !== ruleValue;

    case 'GREATER_THAN':
      return Number(fieldValue) > Number(ruleValue);

    case 'LESS_THAN':
      return Number(fieldValue) < Number(ruleValue);

    case 'GREATER_THAN_OR_EQUALS':
      return Number(fieldValue) >= Number(ruleValue);

    case 'LESS_THAN_OR_EQUALS':
      return Number(fieldValue) <= Number(ruleValue);

    case 'CONTAINS':
      return stringValue.includes(ruleValue);

    case 'NOT_CONTAINS':
      return !stringValue.includes(ruleValue);

    case 'IN': {
      const allowedValues = ruleValue.split(',').map((v) => v.trim());
      return allowedValues.includes(stringValue);
    }

    case 'NOT_IN': {
      const disallowedValues = ruleValue.split(',').map((v) => v.trim());
      return !disallowedValues.includes(stringValue);
    }

    case 'REGEX': {
      const regex = new RegExp(ruleValue);
      return regex.test(stringValue);
    }

    case 'REQUIRED':
      return (
        fieldValue !== null &&
        fieldValue !== undefined &&
        stringValue.trim() !== ''
      );

    default:
      return false;
  }
}

export function getFieldValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
