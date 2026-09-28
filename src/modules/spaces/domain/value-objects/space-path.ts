export class SpacePath {
  constructor(public readonly value: string) {
    if (!value?.startsWith('/')) throw new Error('SpacePath must start with /');
    if (value.length > 1 && value.endsWith('/')) throw new Error('SpacePath must not end with / (except root)');
  }

  static createRoot(spaceId: string): SpacePath {
    return new SpacePath(`/${spaceId}`);
  }

  static createChild(parentPath: SpacePath, childId: string): SpacePath {
    return new SpacePath(`${parentPath.value}/${childId}`);
  }

  static reconstitute(value: string): SpacePath {
    return new SpacePath(value);
  }

  getDepth(): number {
    if (this.value === '/') return 0;
    return this.value.split('/').length - 1;
  }

  getAncestorPath(): SpacePath | null {
    const parts = this.value.split('/').filter(Boolean);
    if (parts.length <= 1) return null;
    parts.pop();
    return new SpacePath(`/${parts.join('/')}`);
  }

  getRootId(): string {
    const parts = this.value.split('/').filter(Boolean);
    return parts[0];
  }

  getLastSegment(): string {
    const parts = this.value.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }

  isDescendantOf(ancestor: SpacePath): boolean {
    return this.value.startsWith(ancestor.value + '/') || this.value === ancestor.value;
  }

  isStrictDescendantOf(ancestor: SpacePath): boolean {
    return this.value.startsWith(ancestor.value + '/');
  }

  replacePrefix(oldPrefix: string, newPrefix: string): SpacePath {
    if (!this.value.startsWith(oldPrefix)) {
      throw new Error(`Path ${this.value} does not start with prefix ${oldPrefix}`);
    }
    return new SpacePath(this.value.replace(oldPrefix, newPrefix));
  }

  equals(other: SpacePath): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}