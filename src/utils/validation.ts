import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ValidationError } from '../types';

const ajv = new Ajv({ allErrors: true, removeAdditional: true });
addFormats(ajv);

export class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  validateSchema(
    data: unknown,
    schema: Record<string, unknown>
  ): { isValid: boolean; errors: ValidationError[] } {
    try {
      const validate = ajv.compile(schema);
      const isValid = validate(data);

      if (!isValid && validate.errors) {
        const errors: ValidationError[] = validate.errors.map(error => ({
          field: error.instancePath || error.schemaPath,
          message: error.message || 'Validation failed',
          value: error.data,
        }));
        return { isValid: false, errors };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            field: 'schema',
            message: 'Invalid schema provided',
          },
        ],
      };
    }
  }

  validateRequestBody(
    body: unknown,
    schema?: Record<string, unknown>
  ): { isValid: boolean; errors: ValidationError[] } {
    if (!schema) {
      return { isValid: true, errors: [] };
    }

    return this.validateSchema(body, schema);
  }
}

// URL pattern validation
export function validateUrlPattern(pattern: string): boolean {
  // Basic URL pattern validation
  // Should start with / and contain valid URL characters
  const urlPatternRegex = /^\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;={}]*$/;
  return urlPatternRegex.test(pattern);
}

// HTTP method validation
export function validateHttpMethod(method: string): boolean {
  const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  return validMethods.includes(method.toUpperCase());
}

// Response status code validation
export function validateStatusCode(code: number): boolean {
  return code >= 100 && code < 600;
}

// Response delay validation
export function validateResponseDelay(delay: number, maxDelay: number): boolean {
  return delay >= 0 && delay <= maxDelay;
}
