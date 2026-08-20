import { normalizeProjectRelativePath } from "./paths.js";

function globExpression(pattern: string): RegExp {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
    } else if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`);
}

export function matchesRepositoryPattern(
  candidatePath: string,
  pattern: string,
): boolean {
  const normalizedPath = normalizeProjectRelativePath(candidatePath);
  const normalizedPattern = normalizeProjectRelativePath(pattern);
  return globExpression(normalizedPattern).test(normalizedPath);
}
