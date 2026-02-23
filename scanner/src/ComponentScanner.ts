import { Project } from 'ts-morph';
import type { ComponentManifest } from 'react-ai-core/src/types.js';
import { SchemaGenerator, type PropSpec } from './SchemaGenerator.js';

export class ComponentScanner {
  private schemaGenerator = new SchemaGenerator();

  scan(srcDir: string): ComponentManifest[] {
    const project = new Project({
      compilerOptions: {
        jsx: 4,
        allowJs: true,
        noEmit: true,
        strict: false,
      },
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([`${srcDir}/**/*.tsx`, `${srcDir}/**/*.ts`]);

    const manifests: ComponentManifest[] = [];

    for (const sourceFile of project.getSourceFiles()) {
      for (const iface of sourceFile.getInterfaces()) {
        const jsdocs = iface.getJsDocs();
        if (jsdocs.length === 0) continue;

        const jsdoc = jsdocs[0];
        const tags = jsdoc.getTags();

        const hasReactAiTag = tags.some((t) => t.getTagName() === 'reactAi');
        if (!hasReactAiTag) continue;

        const key = tags
          .find((t) => t.getTagName() === 'key')
          ?.getComment()
          ?.toString()
          .trim();
        const description = tags
          .find((t) => t.getTagName() === 'description')
          ?.getComment()
          ?.toString()
          .trim();
        const contextSummary = tags
          .find((t) => t.getTagName() === 'contextSummary')
          ?.getComment()
          ?.toString()
          .trim();

        if (!key) throw new Error(`Interface ${iface.getName()} missing @key tag`);
        if (!description) throw new Error(`Interface ${iface.getName()} missing @description tag`);

        const aiWritableProps: string[] = [];
        const allProps: PropSpec[] = [];

        for (const prop of iface.getProperties()) {
          const propJsdocs = prop.getJsDocs();
          const propTags = propJsdocs.flatMap((d) => d.getTags());

          const typeNode = prop.getTypeNode();
          const typeText = typeNode?.getText() ?? 'string';
          const isOptional = prop.hasQuestionToken();

          allProps.push({ name: prop.getName(), typeText, isOptional });

          const isAi = propTags.some((t) => t.getTagName() === 'reactAi');
          if (isAi) aiWritableProps.push(prop.getName());
        }

        manifests.push({
          key,
          description,
          filePath: sourceFile.getFilePath(),
          aiWritableProps,
          propsJsonSchema: this.schemaGenerator.generate(allProps, aiWritableProps),
          contextSummary,
        });
      }
    }

    return manifests;
  }
}
