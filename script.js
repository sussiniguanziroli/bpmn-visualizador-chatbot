document.addEventListener('DOMContentLoaded', () => {
console.log("Script cargado correctamente")
// Función de alerta personalizada para mostrar mensajes al usuario
function customAlert(title, message) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Usar flexbox para centrado
}

// Cerrar modal cuando se hace clic en el botón de cerrar
document.getElementById('close-modal-btn').addEventListener('click', () => {
    document.getElementById('custom-modal').classList.add('hidden');
    document.getElementById('custom-modal').classList.remove('flex');
});

// Cerrar modal si se hace clic fuera de su contenido
window.addEventListener('click', (event) => {
    const modal = document.getElementById('custom-modal');
    if (event.target === modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
});

// Inicializar el visor BPMN.js
const BpmnViewer = window.BpmnJS;
const viewer = new BpmnViewer({
    container: '#diagram-viewer',
    keyboard: {
        bindTo: document
    }
});

const bpmnXmlInput = document.getElementById('bpmn-xml-input');
const loadBpmnBtn = document.getElementById('load-bpmn-btn');

// Elementos de la interfaz de usuario del chatbot
const chatMessagesDiv = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const startChatButton = document.getElementById('start-chat-btn');

// Variables de estado del chatbot
let bpmnProcess = null; // Almacena el proceso principal de BPMN
let elements = {}; // Almacena todos los elementos BPMN (tareas, compuertas, eventos, etc.) por su ID
let currentElement = null; // El elemento BPMN actualmente activo
let isChatActive = false;
let lastHighlightedElementId = null; // Para rastrear el elemento previamente resaltado

// Función para añadir un mensaje a la interfaz de chat
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (sender === 'bot') {
        messageDiv.classList.add('bot-message');
    } else {
        messageDiv.classList.add('user-message');
    }
    messageDiv.textContent = text;
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Desplazamiento automático al final
}

// Función para resaltar un elemento BPMN en el visor
function highlightElement(elementId) {
    const canvas = viewer.get('canvas');
    if (lastHighlightedElementId) {
        canvas.removeMarker(lastHighlightedElementId, 'highlight');
    }
    canvas.addMarker(elementId, 'highlight');
    lastHighlightedElementId = elementId;
}

// Función auxiliar para seleccionar un elemento aleatorio de un array
function getRandomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

// Función para determinar si una compuerta es una "confirmación de backend" que debe ser aleatorizada
function isBackendConfirmationGateway(elementId) {
    const backendGateways = [
        'Id_8efab403-2a6f-4d0c-a9f5-e95e1019b93b', // Validación de número de seguimiento
        'Id_e7ecdd9d-f54d-4a4b-8dce-516af1dab31e', // Verificación de la documentación (¿Documentación completa?)
        'Id_7750e5f4-8588-45b3-b4f2-376f05e48896', // ¿Se aprueba el envío?
        'Id_1e4d2ad2-f4e0-4d7c-afdb-d073ed4bd613', // Confirmación de identidad
        'Id_6e62bcb2-6ae0-4b81-835f-f1463c8e1d90'  // ¿Estado del envío completado?
    ];
    return backendGateways.includes(elementId);
}


// Analizar el XML BPMN para extraer elementos y sus conexiones
async function parseBPMN(xml) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xml, 'text/xml');
    const bpmnNamespace = 'http://www.omg.org/spec/BPMN/20100524/MODEL';

    // Comprobar errores de análisis de XML
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        console.error('Error de DOMParser:', parseError.textContent);
        customAlert('Error de Análisis BPMN', `Estructura XML inválida detectada: ${parseError.textContent}`);
        return null;
    }

    // Obtener el proceso principal (asumiendo un proceso ejecutable principal para el flujo del chatbot)
    // El archivo BPMN proporcionado tiene un proceso con ID 'Id_b543bcf9-bb89-4954-ba10-fbb923190678'
    const processes = Array.from(xmlDoc.getElementsByTagNameNS(bpmnNamespace, 'process')); // Convertir a array
    let mainProcess = null;
    for (let i = 0; i < processes.length; i++) {
        if (processes[i].id === 'Id_b543bcf9-bb89-4954-ba10-fbb923190678') { // Dirigirse al ID de proceso específico
            mainProcess = processes[i];
            break;
        }
    }

    if (!mainProcess) {
        customAlert('Error de Análisis', 'El proceso BPMN especificado (ID: Id_b543bcf9-bb89-4954-ba10-fbb923190678) no se encontró en el XML.');
        return null;
    }

    const parsedElements = {};
    // Recopilar todos los elementos BPMN relevantes, incluyendo nuevos tipos de compuerta
    const elementTypes = [
        'startEvent', 'task', 'exclusiveGateway', 'endEvent', 'subProcess',
        'intermediateThrowEvent', 'parallelGateway', 'inclusiveGateway', 'eventBasedGateway',
        'callActivity' // Added callActivity as it's in your BPMN
    ];
    elementTypes.forEach(type => {
        Array.from(xmlDoc.getElementsByTagNameNS(bpmnNamespace, type)).forEach(el => { // Convertir a array
            if (el.id) {
                parsedElements[el.id] = {
                    id: el.id,
                    name: el.getAttribute('name') || '', // El nombre puede estar vacío para eventos de inicio/fin
                    type: el.localName,
                    outgoing: [],
                    incoming: []
                };
            }
        });
    });

    // Rellenar flujos de entrada/salida para flujos de secuencia
    Array.from(xmlDoc.getElementsByTagNameNS(bpmnNamespace, 'sequenceFlow')).forEach(flow => { // Convertir a array
        const sourceRef = flow.getAttribute('sourceRef');
        const targetRef = flow.getAttribute('targetRef');
        const flowName = flow.getAttribute('name') || ''; // El nombre del flujo puede usarse para condiciones

        if (parsedElements[sourceRef]) {
            parsedElements[sourceRef].outgoing.push({ id: flow.id, target: targetRef, name: flowName });
        }
        if (parsedElements[targetRef]) {
            parsedElements[targetRef].incoming.push({ id: flow.id, source: sourceRef, name: flowName });
        }
    });

    return { process: mainProcess, elements: parsedElements };
}

// Simula el progreso del chatbot a través del diagrama BPMN
async function proceedChat() {
    if (!currentElement) {
        customAlert('Error de Chat', 'Proceso de chat no inicializado o completado.');
        endChat();
        return;
    }

    // Resaltar el elemento actual en el diagrama BPMN
    highlightElement(currentElement.id);

    let botMessage = '';
    let nextElementId = null;
    let expectsUserInput = false;
    let choices = []; // Para compuertas que requieren elección de usuario

    switch (currentElement.type) {
        case 'startEvent':
            botMessage = `¡Hola! Soy un chatbot para el seguimiento de encomiendas internacionales. ¿Qué desea realizar?`;
            nextElementId = currentElement.outgoing[0]?.target;
            // The next element should be "Qué quiere realizar el usuario?", which expects user input.
            // So, we need to ensure expectsUserInput is true for the current element (startEvent's target)
            // or handle the transition logic in the next block. For now, let's keep it consistent.
            break;

        case 'task':
        case 'subProcess':
        case 'callActivity':
            botMessage = `Estamos en el paso: "${currentElement.name}".`;

            // Specific task that requires explicit user choice: "¿Qué quiere realizar el usuario?"
            if (currentElement.name === '¿Qué quiere realizar el usuario?') {
                botMessage += ` Por favor, escriba 'seguimiento' para consultas de seguimiento, 'envio' para consultas de envío, o 'consulta' para una consulta general.`;
                expectsUserInput = true;
                // No auto-proceed, wait for user
            }
            // Another task that requires explicit user choice: "Solicitud Documentación del usuario"
            else if (currentElement.name === 'Solicitud Documentación del usuario') {
                botMessage += ` Por favor, confirme si tiene todos los documentos requeridos. Escriba 'sí' o 'no'.`;
                expectsUserInput = true;
                // No auto-proceed, wait for user
            }
            // General tasks that act like simple input fields or just announce a step
            else if (currentElement.outgoing.length === 1 && !currentElement.name.includes('?')) {
                // If it's a regular task with a single outgoing flow and not a question, auto-proceed
                nextElementId = currentElement.outgoing[0]?.target;
            }
            // If it's a task that is a question but not in our explicit list, or a task with multiple unnamed outgoing flows
            else if (currentElement.name && currentElement.name.includes('?')) {
                botMessage += ` Por favor, responda a la pregunta.`;
                expectsUserInput = true;
            }
            // Fallback for other tasks with multiple outgoing paths that aren't explicitly handled as user choices
            else if (currentElement.outgoing.length > 1) {
                 botMessage += ` Este paso requiere su entrada. Por favor, escriba su respuesta.`;
                 expectsUserInput = true;
            }
            else {
                botMessage += ` Parece que esta tarea no tiene una continuación definida.`;
                endChat();
                return;
            }
            break;

        case 'exclusiveGateway':
            if (isBackendConfirmationGateway(currentElement.id)) {
                // This is a backend confirmation gateway, randomize the choice and auto-proceed
                const randomFlow = getRandomElement(currentElement.outgoing);
                if (randomFlow) {
                    botMessage = `La decisión automática para "${currentElement.name}" es "${randomFlow.name || 'proceder'}".`;
                    addMessage('bot', botMessage); // Add message about the random choice
                    nextElementId = randomFlow.target;
                } else {
                    botMessage += `No se encontraron ramas de salida para la compuerta de backend "${currentElement.name}".`;
                    endChat();
                    return;
                }
            } else {
                // This is a user-driven exclusive gateway
                botMessage = `Estamos en una decisión en "${currentElement.name}".`;
                expectsUserInput = true;
                choices = currentElement.outgoing.map(flow => flow.name.toLowerCase()).filter(name => name);
                if (choices.length > 0) {
                    botMessage += ` Por favor, elija: ${choices.join(' o ')}.`;
                } else {
                    botMessage += " Por favor, escriba 'sí' o 'no' para continuar.";
                    choices = ['sí', 'no'];
                }
            }
            break;

        case 'parallelGateway': // Compuerta AND
            botMessage = `Hemos llegado a una compuerta paralela "${currentElement.name}". Esto significa que múltiples actividades pueden ocurrir simultáneamente.`;
            const randomParallelFlow = getRandomElement(currentElement.outgoing);
            if (randomParallelFlow) {
                addMessage('bot', `Simulando una de las ramas paralelas: "${elements[randomParallelFlow.target].name}".`);
                nextElementId = randomParallelFlow.target;
            } else {
                botMessage += ` No se encontraron ramas de salida para la compuerta paralela.`;
                endChat();
                return;
            }
            break;

        case 'inclusiveGateway': // Compuerta OR
            botMessage = `Hemos llegado a una compuerta inclusiva "${currentElement.name}". Esto permite una o varias rutas.`;
            const randomInclusiveFlow = getRandomElement(currentElement.outgoing);
            if (randomInclusiveFlow) {
                addMessage('bot', `Eligiendo aleatoriamente una de las rutas posibles: "${elements[randomInclusiveFlow.target].name}".`);
                nextElementId = randomInclusiveFlow.target;
            } else {
                botMessage += ` No se encontraron rutas de salida para la compuerta inclusiva.`;
                endChat();
                return;
            }
            break;

        case 'eventBasedGateway': // Compuerta Basada en Eventos
            botMessage = `Hemos llegado a una compuerta basada en eventos "${currentElement.name}". Estamos esperando uno de varios eventos.`;
            const randomEventFlow = getRandomElement(currentElement.outgoing);
            if (randomEventFlow) {
                addMessage('bot', `Simulando que el evento "${elements[randomEventFlow.target].name}" ha ocurrido.`);
                nextElementId = randomEventFlow.target;
            } else {
                botMessage += ` No se encontraron eventos de salida para la compuerta basada en eventos.`;
                endChat();
                return;
            }
            break;

        case 'intermediateThrowEvent':
            botMessage = `Ha ocurrido un evento: "${currentElement.name}".`;
            nextElementId = currentElement.outgoing[0]?.target;
            break;

        case 'endEvent':
            botMessage = `El proceso ha concluido: "${currentElement.name}". ¡Gracias por usar el chatbot!`;
            endChat();
            return;
    }

    addMessage('bot', botMessage);

    if (expectsUserInput) {
        userInput.disabled = false;
        sendButton.disabled = false;
    } else if (nextElementId) {
        setTimeout(() => {
            currentElement = elements[nextElementId];
            proceedChat();
        }, 1000);
    } else {
        addMessage('bot', `Parece que hemos llegado a una parte no manejada del proceso o al final del flujo actual. Por favor, intente iniciar un nuevo chat si tiene más preguntas.`);
        endChat();
    }
}

// Función para manejar la entrada del usuario
async function handleUserInput() {
    const userText = userInput.value.trim();
    if (!userText) return;

    addMessage('user', userText);
    userInput.value = ''; // Limpiar campo de entrada

    userInput.disabled = true;
    sendButton.disabled = true;

    const userLower = userText.toLowerCase();

    let nextFlow = null;
    const possibleFlows = currentElement.outgoing;

    // Logic for user-driven exclusive gateways and tasks requiring explicit choices
    if (currentElement.type === 'exclusiveGateway' && !isBackendConfirmationGateway(currentElement.id) ||
        currentElement.name === '¿Qué quiere realizar el usuario?' ||
        currentElement.name === 'Solicitud Documentación del usuario') {

        for (const flow of possibleFlows) {
            const flowNameLower = flow.name.toLowerCase();

            // Specific mapping for "Qué quiere realizar el usuario?"
            if (currentElement.name === '¿Qué quiere realizar el usuario?') {
                if (userLower.includes('seguimiento') && elements[flow.target]?.name === 'Seguimiento') { nextFlow = flow; break; }
                if (userLower.includes('envio') && elements[flow.target]?.name === 'Envío') { nextFlow = flow; break; }
                if (userLower.includes('consulta') && elements[flow.target]?.name === 'Consulta') { nextFlow = flow; break; }
            }
            // Specific mapping for "Solicitud Documentación del usuario"
            else if (currentElement.name === 'Solicitud Documentación del usuario') {
                if ((userLower.includes('sí') || userLower.includes('si')) && elements[flow.target]?.name === 'Verificación de la documentación (¿Documentación completa?)') { nextFlow = flow; break; }
                if (userLower.includes('no') && elements[flow.target]?.name === 'Envío cancelado') { nextFlow = flow; break; }
            }
            // General exclusive gateway or task-as-gateway requiring explicit named flow input
            else if (flowNameLower && userLower.includes(flowNameLower)) {
                nextFlow = flow;
                break;
            }
             // Fallback for "sí" or "no" if no specific flow name match
            else if ((userLower === 'sí' || userLower === 'si') && (flowNameLower === 'si' || flowNameLower === 'sí')) {
                nextFlow = flow;
                break;
            }
            else if (userLower === 'no' && flowNameLower === 'no') {
                nextFlow = flow;
                break;
            }
        }

        if (nextFlow) {
            currentElement = elements[nextFlow.target];
            await proceedChat();
        } else {
            // Re-prompt with valid choices for user-driven selection
            let possibleChoices = [];
            if (currentElement.name === '¿Qué quiere realizar el usuario?') {
                possibleChoices = ['seguimiento', 'envio', 'consulta'];
            } else if (currentElement.name === 'Solicitud Documentación del usuario') {
                possibleChoices = ['sí', 'no'];
            } else { // Generic exclusive gateway or task-as-gateway choices
                possibleChoices = currentElement.outgoing.map(flow => flow.name.toLowerCase()).filter(name => name);
                if (possibleChoices.length === 0) possibleChoices = ['sí', 'no']; // Fallback
            }

            addMessage('bot', `No entendí su elección. Por favor, responda con una de las siguientes opciones: ${possibleChoices.join(', ')}.`);
            userInput.disabled = false;
            sendButton.disabled = false;
        }

    // Handle tasks/subprocesses expecting arbitrary text input, and randomized gateways (which auto-proceed)
    } else if (currentElement.type === 'task' || currentElement.type === 'subProcess' || currentElement.type === 'callActivity' ||
               currentElement.type === 'parallelGateway' || currentElement.type === 'inclusiveGateway' || currentElement.type === 'eventBasedGateway' ||
               (currentElement.type === 'exclusiveGateway' && isBackendConfirmationGateway(currentElement.id))) {
        
        addMessage('bot', `Recibido: "${userText}". Procesando...`);
        // For these elements, proceedChat() is responsible for determining the next step (either a fixed flow or a random choice)
        await proceedChat(); 

    }
    // Fallback for unhandled inputs/elements
    else {
        addMessage('bot', `Lo siento, no puedo procesar esa entrada en esta etapa. Por favor, reinicie el chat.`);
        endChat();
    }
}

// Cargar el diagrama BPMN cuando se hace clic en el botón
loadBpmnBtn.addEventListener('click', async () => {
    const xml = bpmnXmlInput.value;
    if (!xml) {
        customAlert('Error', 'Por favor, pegue el XML de BPMN en el área de texto primero.');
        return;
    }

    try {
        await viewer.importXML(xml);
        viewer.get('canvas').zoom('fit-viewport');
        customAlert('Éxito', '¡Diagrama BPMN cargado correctamente!');

        const parsedResult = await parseBPMN(xml);
        if (parsedResult) {
            bpmnProcess = parsedResult.process;
            elements = parsedResult.elements;
            const startEvent = Object.values(elements).find(el => el.type === 'startEvent');
            if (startEvent) {
                currentElement = startEvent;
                highlightElement(currentElement.id);
            }
        } else {
            bpmnProcess = null;
            elements = {};
            currentElement = null;
        }
    } catch (err) {
        customAlert('Error', `No se pudo importar el diagrama BPMN: ${err.message}`);
        bpmnProcess = null;
        elements = {};
        currentElement = null;
    }
});

// Manejador del botón Iniciar Chat
startChatButton.addEventListener('click', async () => {
    chatMessagesDiv.innerHTML = ''; // Limpiar chat anterior
    isChatActive = true;
    startChatButton.disabled = true;
    userInput.disabled = true;
    sendButton.disabled = true;

    if (!bpmnProcess || Object.keys(elements).length === 0) {
        customAlert('Error', 'Por favor, cargue un diagrama BPMN primero haciendo clic en "Cargar Diagrama BPMN".');
        endChat();
        return;
    }

    const startEvent = Object.values(elements).find(el => el.type === 'startEvent');
    if (startEvent) {
        currentElement = startEvent;
        await proceedChat();
    } else {
        customAlert('Error', 'No se encontró ningún evento de inicio en el diagrama BPMN cargado. No se puede iniciar el chat.');
        endChat();
    }
});

// Manejador del botón Enviar y la tecla Enter
sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !userInput.disabled) {
        handleUserInput();
    }
});

// Finalizar el chat de forma elegante
function endChat() {
    isChatActive = false;
    userInput.disabled = true;
    sendButton.disabled = true;
    startChatButton.disabled = false;
    currentElement = null;
    if (lastHighlightedElementId) {
        viewer.get('canvas').removeMarker(lastHighlightedElementId, 'highlight');
        lastHighlightedElementId = null;
    }
    addMessage('bot', "Sesión de chat finalizada. Haga clic en 'Iniciar Chat' para comenzar una nueva conversación.");
}

});
