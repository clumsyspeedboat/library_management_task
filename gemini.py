import google.generativeai as genai
import logging, time

def init_gemini(api_key: str):
    genai.configure(
        api_key=api_key,
    )

    global turtle_file
    turtle_file = genai.upload_file(
        path='docker/import/ontology.ttl',
        mime_type='text/plain',
    )

    while turtle_file.state.name == 'PROCESSING':
        logging.info('Waiting for ontology to be processed.')
        time.sleep(2)
        turtle_file = genai.get_file(turtle_file.name)
    
    logging.info('Ontology processing complete.')

def generate_description(entity_name: str) -> str:
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash-002",
    )

    response = model.generate_content([
        f'Provide a detailed description of "{entity_name}".',
        'If it is a book, include information about the setting, characters, themes, key concepts, and its influence.',
        'Do not include any concluding remarks or questions.',
        'Do not mention any Note at the end about not including concluding remarks or questions.',
        'You have the knowledge over the library contents through the following ontology file which is in turtle format.',
        'Dont talk about the ontology file. Talk about the library.',
        'When you are aksed to provide further information about the contents of a book, you can use your own knowledge.',
        turtle_file,
    ])

    return response.text

def init_chat() -> str:
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash-002",
    )

    global chat
    chat = model.start_chat()

    response = chat.send_message([
        'You are a ai chatbot at a library. Answer the following questions from a library user about the library.',
        'You have the knowledge over the library contents through the following ontology file which is in turtle format.',
        'When you are aksed to provide further information about the contents of a book, you can use your own knowledge.',
        'You can also give some recommendations based on the user query.',
        'Otherwise your knowledge is limited to the contents of the ontology file.',
        turtle_file,
        'Now introduce yourself to the user and ask how you can help.',
    ])

    return response.text

def send_chat_message(message: str) -> str:
    if chat:
        response = chat.send_message(message)

        return response.text

    return 'Chat not initialized.'