function pluralize(word) {
  if (!word) return word

  const lower = word.toLowerCase()

  if (lower.endsWith("s")) {
    return lower
  }

  if (lower.endsWith("y") && !/[aeiou]y$/.test(lower)) {
    return lower.slice(0, -1) + "ies"
  }

  if (/(x|z|ch|sh)$/.test(lower)) {
    return lower + "es"
  }

  return lower + "s"
}

function isValidCollectionName(name) {
  return /^[a-z][a-z0-9_]*[a-z]$/.test(name)
}

function normalizeCollectionName(input) {
  if (!input || typeof input !== "string") {
    throw new Error("Invalid collection name")
  }

  const trimmed = input.trim().toLowerCase()
  const plural = pluralize(trimmed)

  if (!isValidCollectionName(plural)) {
    throw new Error("Collection name must start/end with a letter and not end with a number")
  }

  return plural
}

module.exports = {normalizeCollectionName}