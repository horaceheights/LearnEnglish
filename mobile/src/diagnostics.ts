export type DiagnosticContext = {
  lessonId?: string;
  cardIndex?: number;
  totalCards?: number;
  stage?: string;
  prompt?: string;
  qaMode?: boolean;
};

let currentContext: DiagnosticContext = {};

export function setDiagnosticContext(context: DiagnosticContext): void {
  currentContext = { ...context };
}

export function getDiagnosticContext(): DiagnosticContext {
  return { ...currentContext };
}
