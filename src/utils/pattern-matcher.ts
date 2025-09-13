import { MockEndpoint } from '../types';

export class PatternMatcher {
  static matchUrlPattern(requestUrl: string, pattern: string): boolean {
    // Convert URL pattern to regex
    // Support for simple wildcards and path parameters

    // Handle exact matches first
    if (requestUrl === pattern) {
      return true;
    }

    // Convert pattern to regex
    // Replace both {param} and :param with regex group, handle wildcards
    let regexPattern = pattern
      .replace(/\{[^}]+\}/g, '([^/]+)') // {id} -> ([^/]+)
      .replace(/:([^/]+)/g, '([^/]+)') // :id -> ([^/]+)
      .replace(/\*/g, '.*') // * -> .*
      .replace(/\?/g, '\\?') // escape ?
      .replace(/\./g, '\\.'); // escape .

    // Ensure pattern matches from start to end
    regexPattern = `^${regexPattern}$`;

    try {
      const regex = new RegExp(regexPattern);
      return regex.test(requestUrl);
    } catch (error) {
      // If regex is invalid, fall back to exact match
      return requestUrl === pattern;
    }
  }

  static findBestMatch(
    requestUrl: string,
    method: string,
    endpoints: MockEndpoint[]
  ): MockEndpoint | null {
    const matchingEndpoints = endpoints.filter(
      endpoint =>
        endpoint.method === method &&
        endpoint.is_active &&
        this.matchUrlPattern(requestUrl, endpoint.url_pattern)
    );

    if (matchingEndpoints.length === 0) {
      return null;
    }

    // Sort by specificity (longer patterns are more specific)
    // Also prioritize exact matches over pattern matches
    matchingEndpoints.sort((a, b) => {
      // Exact matches get highest priority
      const aIsExact = requestUrl === a.url_pattern;
      const bIsExact = requestUrl === b.url_pattern;

      if (aIsExact && !bIsExact) {
        return -1;
      }
      if (!aIsExact && bIsExact) {
        return 1;
      }

      // Then sort by pattern length (more specific patterns first)
      if (a.url_pattern.length !== b.url_pattern.length) {
        return b.url_pattern.length - a.url_pattern.length;
      }

      // Finally, sort by creation time (newer first)
      return b.created_at.getTime() - a.created_at.getTime();
    });

    return matchingEndpoints[0] || null;
  }

  static extractPathParameters(requestUrl: string, pattern: string): Record<string, string> {
    const params: Record<string, string> = {};

    // Extract parameter names from pattern (both {param} and :param syntax)
    const paramNames: string[] = [];
    
    // Handle {param} syntax
    const braceParamRegex = /\{([^}]+)\}/g;
    let match;
    while ((match = braceParamRegex.exec(pattern)) !== null) {
      if (match[1]) {
        paramNames.push(match[1]);
      }
    }
    
    // Handle :param syntax
    const colonParamRegex = /:([^/]+)/g;
    while ((match = colonParamRegex.exec(pattern)) !== null) {
      if (match[1]) {
        paramNames.push(match[1]);
      }
    }

    if (paramNames.length === 0) {
      return params;
    }

    // Convert pattern to regex with capture groups (handle both syntaxes)
    const regexPattern = pattern
      .replace(/\{[^}]+\}/g, '([^/]+)')
      .replace(/:([^/]+)/g, '([^/]+)');

    try {
      const regex = new RegExp(`^${regexPattern}$`);
      const urlMatch = requestUrl.match(regex);

      if (urlMatch && urlMatch.length > 1) {
        paramNames.forEach((name, index) => {
          const paramValue = urlMatch[index + 1];
          if (paramValue) {
            params[name] = paramValue;
          }
        });
      }
    } catch (error) {
      // If regex fails, return empty params
      return {};
    }

    return params;
  }
}
