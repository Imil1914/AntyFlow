# AF2.1 — линия S: что нужно от F/B и что B должен учесть

Линия S (сервер) ни одного файла F/R/B не трогает и ни от чего не блокируется: может стартовать сразу после F или
параллельно с ней. Ниже — уточнения контрактов для B и контроллера и предложенные строки для модуля переводов.

## 1. Поправки к CONTRACTS §5 (контроллеру — синхронизировать с планом B)

| В CONTRACTS §5 | Как в плане S (проверено по коду) |
|---|---|
| `…/workspaces/<slug>/…/vault/entries/<id>/preview/` | **UUID пространства**, не slug: `/api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/vault/entries/<entry_id>/preview/` — как все маршруты Хранилища (`apps/api/plane/ppm_vault/urls.py:28`, клиент `apps/web/core/services/ppm-vault.service.ts:346-347`) |
| ответ `{kind, html?, sheets?, slides?, truncated}` | плюс `entry_id`, `version`, `content_hash`, `extension`; для `kind: "text"` — `text` и `encoding`; для `kind: "unsupported"` — `reason` |
| поиск: `…/projections/search/?type=page` или `…/projections/pages/?q=` | выбран первый вариант — **как уже заложено в plan-B (Task B3, `searchPages`)**: `GET …/projections/search/?types=page&q=&limit=&cursor=` (параметр `types`, как у поиска задач); элемент — проекция содержимого (`ppmCanvasContentProjectionSchema`) + доп. блок `page`; поиск задач не меняется |
| 409 `VAULT_NAME_CONFLICT`, клиент добавляет « (2)» | 409 теперь несёт `details.suggested_name` (первое свободное «Имя (n).ext») — клиенту достаточно одного повтора |
| gif; аудио/видео — если безопасно | GIF принимается (сигнатура); **аудио/видео — вне AF2.1** (обоснование — plan-S §S4) |

## 2. Для B — точные контракты

### 2.1 Предпросмотр файла (S1)

```ts
// GET `/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}/vault/entries/${entryId}/preview/`
type TPpmVaultPreviewBase = {
  entry_id: string;
  version: number;
  content_hash: string;
  extension: string; // без точки, как в serialize_entry: "docx", "py", "md"
  truncated: boolean; // true — показано не всё (лимиты строк/столбцов/символов/времени)
};
export type TPpmVaultPreview = TPpmVaultPreviewBase &
  (
    | { kind: "docx"; html: string } // только p, h1–h4, ul, li, br, table, tbody, tr, td, без атрибутов
    | { kind: "xlsx"; sheets: { name: string; rows: string[][] }[] } // ≤ 5 листов, ≤ 200 × 50, прямоугольные
    | { kind: "pptx"; slides: { index: number; title: string; text: string }[] } // text — строки через "\n"
    | { kind: "text"; text: string; encoding: "utf-8" | "windows-1251" } // ≤ 256 КиБ
    | { kind: "unsupported"; reason: "type" | "too_large" | "limits" | "invalid" | "encrypted" | "binary" }
  );
```

- Ошибки: `401 AUTHENTICATION_REQUIRED`, `403 VAULT_PERMISSION_DENIED`, `404 VAULT_ENTRY_NOT_FOUND`,
  `400 VAULT_INVALID_FILE_TYPE` (папка), `503 VAULT_STORAGE_FAILED`.
- Что вызывать: для `pdf` — `/pdf/` (или pdf.js), для картинок — `/file/`; для Office, текста, Markdown и кода — `/preview/`
  (картинки/PDF через `/preview/` вернут `unsupported/type`). «Скачать» — всегда `/file/` (для Markdown — `/content/`).
- Безопасность на стороне B (обязательно): `html` вставлять только после DOMPurify с тем же списком тегов и без атрибутов;
  `text` — только как текст/через подсветку (lowlight экранирует), никогда через `dangerouslySetInnerHTML` напрямую;
  язык подсветки выбирать по `extension`.
- Кеш на сервере по хэшу версии; клиентский кеш можно ключевать `entry_id + content_hash`.

### 2.2 Поиск документов PPM для Холста (S2) — совпадает с plan-B, правок в B не нужно

```ts
// GET `/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}/projections/search/`,
//     params { types: "page", q?, limit? (1–50, 20), cursor? }
// results[i] разбирается существующей ppmCanvasContentProjectionSchema (не strict: блок `page` при разборе отбрасывается);
// если B захочет показать автора/дату — расширить схему необязательным полем:
const pageMeta = z.object({
  updated_at: z.string(),
  owned_by: z.object({ id: z.string().uuid(), display_name: z.string() }),
  access: z.enum(["public", "private"]), // private — только собственные документы пользователя
});
// results[i] = { identity: { entity_type: "page", entity_id, workspace_id, project_id, source_url },
//                display: { title, excerpt (≤ 500), extension: ".page", mime_type: "text/html", size_bytes,
//                           preview_url: null, source_status: "active" },
//                capabilities: { read, update, delete_source: false }, source_version, page?: pageMeta }
// next_cursor: string | null
```

- Видимость: публичные документы проекта + собственные приватные пользователя; без архивных, удалённых, отвязанных и
  чужих приватных. Порядок: совпадения в названии первыми, затем по дате изменения.
- Ошибки: `400 PROJECTION_SEARCH_INVALID` (в т. ч. смешанные `types=page,work_item`), `401`,
  `403 CANVAS_PERMISSION_DENIED`, `404 PROJECT_NOT_FOUND`.
- Положить документ на доску — существующим `bindContent` с `entity_type: "page"` (сервер повторно проверяет приватность).
- «Новый документ» (создание страницы Plane) сервер S не меняет: `POST /api/workspaces/{slug}/projects/{pid}/pages/`
  (Plane API, `ProjectPageService.create`), затем `bindContent(entity_type: "page")`.
- Запасной путь B (список Plane с фильтром на клиенте) после S2 срабатывает только при ошибке сети/сервера.

### 2.3 Вставка из буфера и загрузка файлов (S3)

- Имя задаёт клиент: `new File([blob], "Вставка-2026-09-25-153012.png", { type: blob.type })` в существующий
  `vaultService.uploadFile(workspaceId, projectId, file, parentId?)`. Расширение — **по MIME блоба**: `image/png` → `png`,
  `image/jpeg` → `jpg`, `image/webp` → `webp`, `image/gif` → `gif` (сервер сверяет сигнатуру с расширением). Остальные
  типы картинок (svg, avif, heic, tiff, bmp) сервер отклонит — лучше не отправлять и сразу показать ошибку формата.
- `409 VAULT_NAME_CONFLICT` → `error.details.suggested_name: string | null`: повторить загрузку один раз с этим именем;
  если `null` или снова 409 — добавить « (n)» самостоятельно (не больше 5 попыток).
- `400 VAULT_FILE_TOO_LARGE` → `error.details: { size_bytes, limit_bytes }` (лимит по умолчанию 5 МиБ, общий с прокси) —
  показать «Файл больше N МБ» (`size_bytes: 0` — пустой файл, свой текст). Необязательно: сжать большую PNG-вставку
  в JPEG/WebP на клиенте до загрузки.
- `400 VAULT_INVALID_FILE_TYPE` — формат не принимается (в т. ч. аудио/видео, HTML/XML/SVG, код не в UTF-8).
- Новые принимаемые форматы (для фильтра выбора файлов/перетаскивания): `gif` и код/конфиги
  `bash c cc cfg cjs cpp cs css cxx dart go gql graphql h hpp ini java jl js jsx kt kts less log lua mjs php proto ps1 py
  r rb rs scala scss sh sql swift tex toml ts tsv tsx yaml yml zsh` (хранятся как `text/plain`, превью — `kind: "text"`).
  Уже принимались: pdf, png, jpg/jpeg, webp, csv, doc, docx, json, key, md, odp, ods, odt, ppt, pptx, txt, xls, xlsx.

## 3. От F — предложенные ключи переводов (B вписывает в свой блок `af21-canvas.ts`, en/ru)

| Ключ (предложение) | ru | en |
|---|---|---|
| `canvas.file_preview.unsupported.type` | Предпросмотр этого формата недоступен — скачайте файл | Preview isn't available for this format — download the file |
| `canvas.file_preview.unsupported.too_large` | Файл слишком большой для предпросмотра | The file is too large to preview |
| `canvas.file_preview.unsupported.limits` | Файл слишком сложный для безопасного предпросмотра | The file is too complex to preview safely |
| `canvas.file_preview.unsupported.invalid` | Не удалось прочитать файл — возможно, он повреждён | Couldn't read the file — it may be damaged |
| `canvas.file_preview.unsupported.encrypted` | Файл защищён паролем | The file is password-protected |
| `canvas.file_preview.unsupported.binary` | Файл не похож на текст | The file doesn't look like text |
| `canvas.file_preview.truncated` | Показано начало файла | Showing the beginning of the file |
| `canvas.paste.too_large` | Файл больше {limit} МБ — Хранилище его не примет | The file is larger than {limit} MB — the Vault won't accept it |
| `canvas.paste.unsupported_type` | Этот формат Хранилище не принимает | The Vault doesn't accept this format |

## 4. Открытый вопрос: имя файла при «Скачать» (plan-B, RB9 — «опционально S»)

plan-B просит `GET …/vault/entries/<id>/file/?download=1` → `attachment` с настоящим именем файла; в plan-S этого **нет**
(сейчас `/file/` отдаёт `filename="<entry_id>.<ext>"`, `ppm_vault/views.py:338`, в S3-режиме — подписанная ссылка с
`disposition="inline"`, `ppm_vault/storage.py:57-65`). Если контроллер решит добавить (≈15 мин, файлы линии S):
`private_object_url(..., disposition=…)` — новый необязательный параметр (по умолчанию `"inline"`); в
`PpmVaultFileContentView.get` при `download=1` — `disposition="attachment"` и заголовок
`django.utils.http.content_disposition_header(as_attachment=True, filename=entry.name)` (ASCII-`filename` или
`filename*=utf-8''…` для кириллицы); тест: кириллическое имя, `download=1` → `attachment; filename*=utf-8''…`, без
параметра — прежний заголовок (существующий тест `test_pdf_is_private_and_object_key_has_no_original_name` не меняется).
Без этого B скачивает файл с именем-идентификатором (или задаёт имя через `saveCanvasBlob`, как в plan-B).

## 5. Для контроллера

- Тесты линии S идут в изолированном compose-проекте `ppm-af21-s` (plan-S §0.1): образ переиспользуется тегом
  `docker tag plane-fork-api-tests:latest ppm-af21-s-api-tests:latest`; нужна сеть к PyPI (compose-файл ставит
  `requirements/test.txt` при каждом запуске). Dev-стек (:8000) не перезапускается; пересборка Vite не нужна.
- Базовая линия: `ppm_vault` 19 passed, `ppm_canvas` 99 passed; после линии S — 34 и 102 (итого 136).
- После ревью: `docker compose -p ppm-af21-s -f docker-compose-test.yml down -v`.
