# Backend API Tests — Resultados

Todos los tests ejecutados con `curl` contra el backend en Docker (Oracle 26ai + Fastify).
Fecha: 2026-03-11

## Auth (3 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `POST /api/auth/login` con credenciales válidas | ✅ 200 — token JWT devuelto |
| 2 | `POST /api/auth/login` con password incorrecto | ✅ 401 — "Credenciales inválidas" |
| 3 | `GET /api/auth/me` con token válido | ✅ 200 — datos usuario + tenant |
| 4 | `POST /api/auth/switch-tenant` | ✅ 200 — nuevo token generado |

## Tags (2 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/tags` (vacío) | ✅ 200 — `{"tags":[]}` |
| 2 | `POST /api/tags` crear "Urgente" con color | ✅ 201 — tag creado con id |
| 3 | `POST /api/tags` crear "Reunion" con color | ✅ 201 — tag creado |
| 4 | `GET /api/tags` (con datos) | ✅ 200 — 2 tags ordenados por nombre |
| 5 | `POST /api/tags` sin nombre | ✅ 400 — "El nombre es obligatorio" |

## Groups (7 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/groups` (vacío) | ✅ 200 — total: 0 |
| 2 | `POST /api/groups` crear "Junta Directiva" | ✅ 201 — grupo creado |
| 3 | `GET /api/groups/:id` detalle | ✅ 200 — datos grupo + members vacío |
| 4 | `PUT /api/groups/:id` editar nombre | ✅ 200 — nombre actualizado |
| 5 | `POST /api/groups/:id/members` añadir miembro | ✅ 201 — `{"ok":true}` |
| 6 | `GET /api/groups/:id` con miembro | ✅ 200 — members: [{name, email}] |
| 7 | `POST /api/groups/:id/members` duplicado | ✅ 409 — "El usuario ya es miembro del grupo" |
| 8 | `DELETE /api/groups/:id/members/:userId` | ✅ 200 — `{"ok":true}` |
| 9 | `GET /api/groups?search=junta` | ✅ 200 — 1 resultado |
| 10 | `POST /api/groups` + `DELETE /api/groups/:id` | ✅ 200 — grupo eliminado |
| 11 | `GET /api/groups` (estado final) | ✅ 200 — total: 1 |

## Members (5 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/members` lista completa | ✅ 200 — 1 miembro (admin) |
| 2 | `GET /api/members?search=admin` | ✅ 200 — 1 resultado |
| 3 | `GET /api/members?active=true` | ✅ 200 — solo activos |
| 4 | `GET /api/members?active=false` | ✅ 200 — solo inactivos |
| 5 | `GET /api/members/:id` detalle admin | ✅ 200 — datos + activitiesOwned/Attended |
| 6 | `GET /api/members/:id` con bio (CLOB) | ✅ 200 — bio devuelto como string |
| 7 | `GET /api/members/nonexistent` | ✅ 404 — "Miembro no encontrado" |
| 8 | `POST /api/members` crear usuario + membership | ✅ 201 — usuario creado |
| 9 | `POST /api/members` sin nombre | ✅ 400 — "Nombre y email son obligatorios" |
| 10 | `POST /api/members` email duplicado | ✅ 409 — "El usuario ya es miembro..." |
| 11 | `PUT /api/members/:id` editar perfil + rol | ✅ 200 — datos actualizados |
| 12 | `GET /api/members/:id` verificar edición | ✅ 200 — nombre, rol, phone, bio correctos |
| 13 | `DELETE /api/members/self` (auto-desactivación) | ✅ 400 — "No puedes desactivar tu propia cuenta" |
| 14 | `DELETE /api/members/:id` desactivar otro | ✅ 200 — `{"ok":true}` |
| 15 | `GET /api/members/:id` verificar desactivado | ✅ 200 — active: false |
| 16 | `GET /api/members?page=1&limit=1` paginación | ✅ 200 — total: 3, showing: 1 |
| 17 | `GET /api/members` sin auth | ✅ 401 — "No autorizado" |

## Activities (12 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/activities` (vacío) | ✅ 200 — total: 0 |
| 2 | `POST /api/activities` crear reunión con attendees + tags | ✅ 201 — actividad creada |
| 3 | `POST /api/activities` crear tarea simple | ✅ 201 — actividad creada |
| 4 | `POST /api/activities` sin título | ✅ 400 — "El título es obligatorio" |
| 5 | `GET /api/activities` lista con datos | ✅ 200 — 2 actividades con tags y attendees |
| 6 | `GET /api/activities/:id` detalle | ✅ 200 — owner, tags, attendees, docs, albums |
| 7 | `GET /api/activities?type=MEETING` | ✅ 200 — 1 resultado |
| 8 | `GET /api/activities?status=PENDING` | ✅ 200 — 2 resultados |
| 9 | `PATCH /api/activities/:id/status` Kanban | ✅ 200 — status: IN_PROGRESS |
| 10 | `PATCH /api/activities/:id/status` inválido | ✅ 400 — "Estado inválido" |
| 11 | `PUT /api/activities/:id` editar + reemplazar tags/attendees | ✅ 200 — actualizado |
| 12 | `GET /api/activities/:id` post-update | ✅ 200 — tags: 0, attendees: 0 |
| 13 | `POST /api/activities/:id/attend` auto-registro | ✅ 201 — `{"ok":true}` |
| 14 | `POST /api/activities/:id/attend` duplicado | ✅ 409 — "Ya estás apuntado/a" |
| 15 | `DELETE /api/activities/:id/attend` | ✅ 200 — `{"ok":true}` |
| 16 | `POST /api/activities/fake/attend` inexistente | ✅ 404 — "Actividad no encontrada" |
| 17 | `DELETE /api/activities/:id` por creador | ✅ 200 — `{"ok":true}` |
| 18 | `DELETE /api/activities/fake` inexistente | ✅ 404 |
| 19 | `GET /api/activities` post-delete | ✅ 200 — total: 1 |
| 20 | `GET /api/activities?participantId=admin-001` | ✅ 200 — 1 resultado |
| 21 | `GET /api/activities?page=1&limit=1` | ✅ 200 — paginación correcta |

## Documents (5 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/documents` (vacío) | ✅ 200 — total: 0 |
| 2 | `POST /api/documents` upload multipart | ✅ 201 — doc creado, status: READY |
| 3 | `POST /api/documents` segundo documento | ✅ 201 |
| 4 | `POST /api/documents` sin título | ✅ 400 — "El título es obligatorio" |
| 5 | `GET /api/documents` lista | ✅ 200 — 2 docs con uploaderName |
| 6 | `GET /api/documents/:id` detalle | ✅ 200 — datos + activities vinculadas |
| 7 | `GET /api/documents?search=presupuesto` | ✅ 200 — 1 resultado |
| 8 | `GET /api/documents/:id/download` | ✅ 200 — contenido archivo correcto |
| 9 | `GET /api/documents/fake` | ✅ 404 — "Documento no encontrado" |
| 10 | `POST /api/activities/:id/documents` vincular | ✅ 201 — `{"ok":true}` |
| 11 | `GET /api/documents/:id` con actividad vinculada | ✅ 200 — activities: [título] |
| 12 | `DELETE /api/activities/:id/documents/:docId` desvincular | ✅ 200 |
| 13 | `DELETE /api/documents/:id` | ✅ 200 — `{"ok":true}` |
| 14 | `GET /api/documents` post-delete | ✅ 200 — total: 1 |
| 15 | `GET /api/documents?page=1&limit=1` | ✅ 200 — paginación correcta |

## Albums/Photos (11 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/albums` (vacío) | ✅ 200 — total: 0 |
| 2 | `POST /api/albums` crear álbum GENERAL | ✅ 201 |
| 3 | `POST /api/albums` crear álbum PRIVATE | ✅ 201 |
| 4 | `POST /api/albums` título < 2 chars | ✅ 400 — "mínimo 2 caracteres" |
| 5 | `GET /api/albums` lista | ✅ 200 — 2 álbumes con photoCount |
| 6 | `GET /api/albums/:id` detalle | ✅ 200 — photos: [], activities: [] |
| 7 | `POST /api/albums/:id/photos` upload 2 fotos | ✅ 201 — 2 fotos con width/height, thumbnail generado con sharp |
| 8 | `GET /api/albums/:id` con fotos | ✅ 200 — cover auto-set, 2 fotos |
| 9 | `GET /api/photos/:id/file` (header auth) | ✅ 200 — 70 bytes PNG |
| 10 | `GET /api/photos/:id/thumbnail` (header auth) | ✅ 200 — 254 bytes WebP |
| 11 | `GET /api/photos/:id/file?token=` (query auth) | ✅ 200 — (corregido: request.user se setea) |
| 12 | `PATCH /api/albums/:id/photos/:photoId` caption | ✅ 200 — caption actualizado |
| 13 | `PUT /api/albums/:id` editar título + cover | ✅ 200 |
| 14 | `POST /api/activities/:id/albums` vincular | ✅ 201 |
| 15 | `GET /api/albums/:id` con actividad | ✅ 200 — activities: [título] |
| 16 | `GET /api/activities/:id` con álbum | ✅ 200 — albums: [título] |
| 17 | `DELETE /api/activities/:id/albums/:albumId` desvincular | ✅ 200 |
| 18 | `DELETE /api/albums/:id/photos/:photoId` (era cover) | ✅ 200 — cover auto-switch |
| 19 | `GET /api/albums/:id` post-delete foto | ✅ 200 — cover cambiado, 1 foto |
| 20 | `GET /api/albums?search=evento` | ✅ 200 — 1 resultado |
| 21 | `DELETE /api/albums/:id` con fotos | ✅ 200 — archivos limpiados |
| 22 | `GET /api/albums` post-delete | ✅ 200 — total: 1 |
| 23 | `GET /api/albums/fake` | ✅ 404 |
| 24 | `GET /api/photos/:id/thumbnail?token=` | ✅ 200 — query token auth OK |
| 25 | `GET /api/albums/:id/download` ZIP | ✅ 200 — 200 bytes ZIP |

## Dashboard (4 endpoints)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/dashboard/stats` | ✅ 200 — totalMembers: 1, activitiesThisMonth: 1, recentActivities, recentDocuments, upcomingActivities |
| 2 | `GET /api/admin/stats` | ✅ 200 — totalMembers: 3, totalDocuments: 1, totalActivities: 1, totalAlbums: 1 |
| 3 | `GET /api/admin/logo` (no existe) | ✅ 404 — "No hay logo configurado" |
| 4 | `POST /api/admin/logo` upload | ✅ 200 — `{"ok":true}` (testeado desde dentro del container; curl Windows/MSYS tiene bug con multipart) |
| 5 | `GET /api/admin/logo` (existe) | ✅ 200 — imagen servida |
| 6 | `GET /api/dashboard/stats` sin auth | ✅ 401 — "No autorizado" |

## Search (1 endpoint)

| # | Test | Resultado |
|---|------|-----------|
| 1 | `GET /api/search?q=reunion` (global) | ✅ 200 — activities: 1, documents: 0, albums: 0, members: 0 |
| 2 | `GET /api/search?q=admin` (global) | ✅ 200 — members: 1 ("Administrador") |
| 3 | `GET /api/search?q=admin&type=members` | ✅ 200 — solo miembros |
| 4 | `GET /api/search?q=evento&type=albums` | ✅ 200 — 1 álbum |
| 5 | `GET /api/search?q=acta&type=documents` | ✅ 200 — 1 documento |
| 6 | `GET /api/search?q=x` (< 2 chars) | ✅ 400 — "al menos 2 caracteres" |
| 7 | `GET /api/search` sin q | ✅ 400 |
| 8 | `GET /api/search?q=test` sin auth | ✅ 401 |
| 9 | `GET /api/search?q=nada_existe` | ✅ 200 — 0 resultados en todas las categorías |

## Resumen

| Módulo | Endpoints | Tests | Resultado |
|--------|-----------|-------|-----------|
| Auth | 3 | 4 | ✅ All pass |
| Tags | 2 | 5 | ✅ All pass |
| Groups | 7 | 11 | ✅ All pass |
| Members | 5 | 17 | ✅ All pass |
| Activities | 12 | 21 | ✅ All pass |
| Documents | 5 | 15 | ✅ All pass |
| Albums/Photos | 11 | 25 | ✅ All pass |
| Dashboard | 4 | 6 | ✅ All pass |
| Search | 1 | 9 | ✅ All pass |
| **Total** | **50** | **113** | **✅ All pass** |

## Bugs encontrados y corregidos durante testing

1. **Tags `created_at`**: La tabla `tags` no tiene columna `created_at` — eliminada del SELECT
2. **Groups COUNT binds**: Se pasaban binds de paginación (`limitNum`, `offset`) al COUNT query que no los usa — separados en `countBinds` y `listBinds`
3. **CLOB circular JSON**: Campos CLOB (`bio`, `description`) devolvían objetos LOB en vez de strings — añadido `oracledb.fetchAsString = [oracledb.CLOB]` en `db.ts`
4. **Seed bcrypt hash**: El hash en `003_seed.sql` era placeholder — generado hash real para "admin123"
5. **Query token auth**: `verifyImageAuth` verificaba el token pero no seteaba `request.user` — añadido `request.user = decoded`
