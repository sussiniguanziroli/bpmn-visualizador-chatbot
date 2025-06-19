# 🤖 Chatbot y Visualizador BPMN

Este proyecto es una aplicación web simple que permite **visualizar diagramas BPMN** e **interactuar con un chatbot** que simula un flujo conversacional basado en la lógica definida en el diagrama BPMN.

---

## 📁 Contenido del Proyecto

El proyecto está estructurado en tres archivos principales:

- `index.html`: Estructura de la página web, incluyendo el visor BPMN y la interfaz del chatbot.
- `style.css`: Estilos personalizados para la aplicación, complementando Tailwind CSS.
- `script.js`: Lógica principal, incluyendo la carga del diagrama BPMN, análisis del XML y el flujo del chatbot.

---

## 🚀 Cómo Usar

### 1. Clonar el repositorio en su sistema

1. Cree una carpeta local, por ejemplo: `bpmn-chatbot`.
2. Ejecute el comando:

```
git clone https://github.com/sussiniguanziroli/bpmn-visualizador-chatbot
```

### 2. Abrir la Aplicación

- Abra el archivo `index.html` en su navegador preferido.

### 3. Cargar un Diagrama BPMN

1. En la sección "Visualizador de Diagramas BPMN", pegue el contenido XML de su diagrama (por ejemplo, **Seguimiento de encomiendas internacionales**).
2. Haga clic en el botón **"Cargar Diagrama BPMN"**.
3. El diagrama se renderizará en pantalla.

### 4. Iniciar el Chatbot

- Haga clic en **"Iniciar Chat"**.
- El chatbot iniciará la conversación resaltando el nodo de inicio del diagrama BPMN.

### 5. Interactuar con el Chatbot

- Escriba sus respuestas en el campo de entrada y presione **"Enviar"** o **Enter**.
- El chatbot seguirá el flujo definido por el diagrama.
- Si una compuerta tiene flujos con nombres como `"SI"` o `"NO"`, debe responder exactamente con esos nombres.
- El elemento activo se resaltará en el diagrama para mostrar el progreso.

---

## ⚙️ Notas Importantes

### ✅ Compatibilidad BPMN Mejorada

- Manejo de compuertas exclusivas (`exclusive gateways`) mediante coincidencia de nombres de flujos.
- Soporte para tareas que implican decisión si:
  - El nombre de la tarea es una pregunta.
  - La tarea tiene múltiples flujos salientes sin nombres.

### 🔀 Manejo de Compuertas Avanzadas (con Randomización)

| Tipo de Compuerta | Comportamiento |
|-------------------|----------------|
| **XOR (exclusiva)** | Se compara la entrada del usuario con los nombres de flujos salientes. Si no coincide, se elige una ruta aleatoriamente. |
| **AND (paralela)** | Se notifica una bifurcación paralela. Para simularla linealmente, se elige una rama aleatoria. Las otras se asumen como "en segundo plano". |
| **OR (inclusiva)** | Se indica que hay múltiples opciones posibles. Se selecciona aleatoriamente una para continuar. |
| **Basada en eventos** | El chatbot espera un evento, luego selecciona una salida aleatoria para simular su ocurrencia. |

- ⚖️ La **randomización 50/50** asegura que siempre se avanza en el flujo, incluso sin entrada del usuario.

### 🧠 Interacción Genérica

- Las respuestas del chatbot se basan únicamente en los **nombres** de los elementos del diagrama.
- Se recomienda utilizar **nombres descriptivos** para una mejor experiencia.

---

## 🚫 Limitaciones Actuales

- No hay ejecución real paralela de múltiples ramas en el chat.
- No se maneja la **fusión** de ramas paralelas o inclusivas (Join gateways).
- No se soportan:
  - **Bucles complejos**.
  - **Compensaciones de procesos**.
  - **Eventos intermedios complejos**.
- Los flujos de mensajes entre participantes son solo visuales; no se ejecuta lógica entre pools.

---

