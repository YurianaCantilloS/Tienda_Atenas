# PANEL DE ADMINISTRACIÓN — Guía de instalación
### Athens Style Shop · solo para la dueña de la tienda

Este panel te deja publicar/ocultar productos, crear productos que **no**
tocan el inventario del ERP, ver los pedidos con gráficas de ventas, y
cambiar el banner y los avisos de la página sin tocar código.

---

## ⚙️ PASO 1 — Activar el panel en Supabase (5 minutos, una sola vez)

### 1.1 Crea tu usuario de acceso
1. Abre tu proyecto en **https://supabase.com/dashboard**
2. Menú de la izquierda → **Authentication** → **Users**
3. Botón **Add user** → **Create a new user**
4. Pon tu correo y una contraseña
5. Marca ✅ **Auto Confirm User** ← importante, si no no funciona el login
6. **Save**

### 1.2 Pega el SQL
1. Menú de la izquierda → **SQL Editor** → botón **New query**
2. Abre el archivo **`sql/panel-admin.sql`** de esta carpeta
3. Copia **todo** su contenido y pégalo en el editor
4. Presiona **Run** (o el botón ▶)

Si no sale ningún error rojo, salió bien. ✅
Puedes correrlo otra vez si quieres: no rompe nada.

> **¿Qué hace ese SQL?**
> - Crea la tabla `pedidos` (donde se guardan las compras)
> - Agrega 2 columnas a `productos`: `producto_padre_id` y `creado_en_tienda`
> - Deja los pedidos protegidos: solo tú puedes verlos
> - **No toca** la tabla `productos` de forma que rompa tu ERP

---

## ⚙️ PASO 2 — Abrir el panel

Abre **`admin.html`**:
- Si la tienes en Netlify: `https://tu-sitio.netlify.app/admin.html`
- Si la estás probando en el computador: dale doble clic al archivo

Entra con el correo y la contraseña que creaste en el paso 1.1.

---

## 📚 Cómo usar cada sección

### 📊 Resumen
Dinero vendido, cuántos pedidos llevas, el ticket promedio, y 4 gráficas:
ventas por día, pedidos por estado, productos más vendidos y ventas por categoría.

### 📦 Productos
Acá ves **todo junto**: lo que viene del ERP y lo que creaste en el panel.

- El **interruptor** (verde) publica u oculta en la página, al instante
- Filtros para ver: solo publicados, solo ocultos, solo externos o sin stock
- **Editar** cambia nombre, precio, foto, descripción, stock y categoría
- **Editar** un producto que viene del ERP: puedes, pero si cambias el stock
  el ERP lo puede sobrescribir en su próxima sincronización

### ➕ Crear producto
Un producto que vive solo en la tienda.

La clave está en **Origen**:
- **Externo** → aparece en la página y **no suma inventario** en el ERP ← usa este
- **Propio** → es del ERP

Para la foto: **arrástrala** al recuadro morado y se sube sola a Cloudinary.
(Si ya la tienes subida, también puedes pegar el link y la ves al instante.)

El **costo** y el **precio de venta** los escribes tú, a mano. El panel no
calcula nada: los guarda tal cual.

### 🧾 Pedidos
Cada compra que llega desde la tienda se guarda sola aquí, con los datos
del cliente, la dirección y los productos.

Cuando abres un pedido, abajo ves cuatro botones:

| Botón | Qué hace |
|---|---|
| 🟢 **ENTREGADO** (verde) | La etiqueta cambia sola a "entregado" |
| 🔴 **CANCELAR** (rojo) | Borra el pedido, pidiendo confirmación |
| **Enviar por WhatsApp** | Abre el chat con el cliente |
| **Factura** | Genera el PDF de la factura con el mismo formato del ERP |

En **Factura** puedes imprimir o descargar el PDF, tal como en el ERP.

---

## 🎨 Apariencia (sin tocar código)

**Panel → Apariencia**

Desde aquí cambias cosas que se ven en la tienda, sin pedirle a nadie que
edite un archivo:

| Qué puedes cambiar | Dónde sale |
|---|---|
| La foto del banner | Arriba de la página |
| Si el banner se ve o no | Interruptor |
| El aviso del frente | Barra de arriba, bajo el menú |
| El color del aviso | Lila, rosa, verde o amarillo |
| El nombre del negocio | Pie de página |
| Tu ciudad y tu teléfono | Pie de página |
| El Instagram del pie | Pie de página |
| Tu **WhatsApp** | Botón de la página, pedido al cliente y factura PDF |

La pantalla está en **dos columnas**:

- **Izquierda**: el formulario — la foto del banner, el texto del aviso,
  el color, los interruptores de *Publicar* y tus datos de contacto.
- **Derecha**: **tu página de verdad**, no un dibujo.

La derecha trae **una sola ventana con tu página de verdad**, cargada con
el mismo CSS: el menú, la barra que se mueve, el aviso, el banner, la
búsqueda, los filtros, **tus productos con sus fotos y precios** y el pie
de página.

Esa ventana **se repinta en el instante** mientras escribes el aviso,
cambias el color o subes la foto del banner: no hay que guardar nada
para verlo. Se puede desplazar dentro como si fuera la página en el
celular. Debajo hay un enlace **Ver mi página real ↗** para abrirla en
otra pestaña, y recién al final el botón **Guardar cambios**.

### ⚠️ Falta correr este SQL (una sola vez)
Para que los clientes vean los cambios, entra al
**SQL Editor de Supabase**, pega lo que está en `sql/apariencia-tienda.sql`
y dale **Run**. Solo agrega columnas a la tabla `configuracion` que ya usas
en el ERP; no borra nada.

Si te olvidas, el panel te avisa con una franjita amarilla y guarda el cambio
solo en tu computador.

---

### 💬 Tus datos de contacto
En **Apariencia**, el recuadro **Datos de contacto** cambia:
- El **botón de WhatsApp** que ven los clientes
- El mensaje que se le manda al cliente con el pedido
- La **factura PDF** (nombre, ciudad, teléfono, Instagram)

El WhatsApp se escribe **sin el +**, con el 57 adelante y todo junto:
`573184346975`

---

## 🗑️ Iconos

- La **papelera** en la lista de productos es un ícono, no un emoji
- Cada estado de pedido tiene **su color y su ícono**:
  - 🟡 **Nuevo** (estrella, amarillo) — como llega el pedido
  - 🟢 **Entregado** (caja, verde)

En cada pedido abajo hay **dos botones**:
- **Marcar entregado** → la etiqueta del pedido cambia sola de "nuevo" a "entregado"
- **Cancelar y borrar** → el pedido **se elimina de la lista**

Los dos piden confirmación antes de borrar, para que no se te borre nada por error.
- El botón de **WhatsApp** es el ícono verde oficial

En los pedidos ya **no hay casilla de notas**: el único control es el estado.

La papelera siempre **pide confirmación** antes de borrar. Si solo quieres
que un producto no aparezca, apaga el interruptor en vez de borrarlo.

---

## 📷 Subir fotos arrastrándolas (Cloudinary)

**Ya está configurado, no tienes que hacer nada.** Se copió tal cual de tu ERP:

- Cloud name: `wf9vrurd`
- Upload preset: `preset_productos`

> Fuente: `Atenas Acounts/frontend/assets/js/app.js:56`

### Cómo usarlo
En **Crear producto** o en el banner de la página:
- **Arrastra** la foto desde el computador y suéltala en el recuadro morado
- (o haz clic en el recuadro para buscarla)
- Se sube sola a Cloudinary y la foto aparece en el recuadro
- Si ya había una foto, abajo aparece **Cambiar foto** para reemplazarla

Los datos de Cloudinary **ya no se editan en el panel**: quedan fijos en
`js/config.js`. Si algún día cambias el preset en el ERP, cambias esas dos
líneas ahí.

⚠️ **Nunca pongas tu API Secret en ninguna parte.** Con el preset "unsigned"
no hace falta: solo el nombre.

---

## 🔐 Sobre la seguridad

- Los pedidos (con teléfonos y direcciones) **solo los ves tú**: hace falta
  tener sesión iniciada. Sin tu clave, nadie puede leerlos.
- El archivo `js/config.js` **sí es público** (el navegador lo descarga para
  poder leer productos). Por eso el panel no depende de una clave escrita ahí,
  sino del login de Supabase.

---

## ❓ Si algo no funciona

| Lo que ves | Qué hacer |
|---|---|
| "No se pudieron cargar los productos: column does not exist" | Correte `sql/panel-admin.sql` (Paso 1.2) |
| "No se pudieron cargar los pedidos" / "no existe la tabla" | Igual: falta correr el SQL |
| "permission denied" al crear o editar | Vuelve a correr el SQL completo (la Parte 6 son los permisos) |
| No te deja entrar | Revisa que marcaste ✅ *Auto Confirm User* |
| No aparecen pedidos nuevos | Abre la consola del navegador (F12) y mira si hay errores |
