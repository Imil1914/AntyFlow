// Схема стора для сервера синхронизации. Должна совпадать с клиентской —
// то есть знать кастомную ноду `flow-node` и её props (см. FlowNodeShapeUtil
// в основном приложении: src/renderer/src/shapes/FlowNodeShapeUtil.tsx).
// Связи (`flow-arrow`) используют стандартную схему arrow, поэтому отдельно не нужны.
import { T } from '@tldraw/validate'
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from '@tldraw/tlschema'

export function createFlowSchema() {
  return createTLSchema({
    shapes: {
      ...defaultShapeSchemas,
      'flow-node': {
        props: {
          w: T.number,
          h: T.number,
          kind: T.string,
          title: T.string,
          body: T.string,
          model: T.string,
          history: T.string,
          contextTokens: T.number,
          answerId: T.string,
          sourceId: T.string,
          extra: T.string
        }
      }
    },
    bindings: defaultBindingSchemas
  })
}
