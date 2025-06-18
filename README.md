# Chatbot y Visualizador BPMN

Este proyecto es una aplicación web simple que permite visualizar diagramas BPMN y, al mismo tiempo, interactuar con un chatbot que simula un flujo conversacional basado en la lógica definida en el diagrama BPMN.

---

## 📁 Contenido del Proyecto

El proyecto está estructurado en tres archivos principales:

- `index.html`: Define la estructura de la página web, incluyendo el visor BPMN y la interfaz del chatbot.
- `style.css`: Contiene los estilos CSS personalizados para la aplicación, complementando las clases de Tailwind CSS.
- `script.js`: Maneja la lógica de la aplicación, incluyendo la carga y visualización de diagramas BPMN, el análisis del XML BPMN y la interacción del chatbot.

---

## 🚀 Cómo Usar

### 1. Guardar los archivos

1. Cree una carpeta local (por ejemplo: `bpmn-chatbot`).
2. Guarde:
   - El contenido del archivo HTML en `index.html`.
   - El CSS en `style.css`.
   - El JavaScript en `script.js`.

### 2. Abrir la aplicación

Abra el archivo `index.html` en su navegador preferido.

### 3. Cargar su diagrama BPMN

1. En la sección "Visualizador de Diagramas BPMN", pegue el contenido XML de su diagrama BPMN (por ejemplo: **Seguimiento de encomiendas internacionales**).
2. Haga clic en **"Cargar Diagrama BPMN"**.
3. El diagrama se renderizará en el visor.

### 4. Iniciar el Chatbot

1. Haga clic en el botón **"Iniciar Chat"**.
2. El chatbot comenzará a guiarlo a través del flujo definido en el diagrama.
3. El elemento BPMN activo será resaltado visualmente.

### 5. Interactuar con el Chatbot

- Escriba respuestas en el campo de entrada y presione **"Enviar"** o **Enter**.
- Las respuestas se basan directamente en los **nombres de tareas y flujos** de su diagrama BPMN.
- Si una compuerta tiene salidas como "SI" o "NO", el chatbot espera esas respuestas exactamente.

---

## ⚙️ Notas Importantes

### ✅ Compatibilidad BPMN Mejorada

- El chatbot maneja decisiones en compuertas exclusivas (`exclusive gateways`) comparando nombres de flujos salientes.
- También responde a tareas que implícitamente esperan una respuesta (por ejemplo, si el nombre es una pregunta o hay múltiples salidas sin nombre).

### 🔤 Interacción Genérica

- Las respuestas del chatbot son **genéricas** y se basan en los nombres del diagrama.
- Asegúrese de usar **nombres descriptivos** en los elementos BPMN.

---

## ⚠️ Limitaciones Actuales

Actualmente, el chatbot **NO soporta**:

- Compuertas **paralelas (AND)**, **inclusivas (OR)**, o **basadas en eventos**.
- Eventos intermedios complejos (excepto de lanzamiento simple).
- Ciclos, subprocesos complejos o bucles anidados.
- Flujos de mensajes entre **participantes** que alteren la lógica secuencial directa.

---

## 🌐 Idioma

- Toda la interfaz y las interacciones están diseñadas en **español**.

---

## 📄 Licencia

Este proyecto puede adaptarse y reutilizarse libremente con atribución.  
