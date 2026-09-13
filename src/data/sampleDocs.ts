export interface SampleDoc {
  id: string;
  title: string;
  category: string;
  sourceName: string;
  url?: string;
  text: string;
}

export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: "transformer-arch",
    title: "Mecanismo de Atenção e Arquitetura Transformer",
    category: "Inteligência Artificial",
    sourceName: "Artigo: Attention Is All You Need (Síntese Técnica)",
    url: "https://arxiv.org/abs/1706.03762",
    text: `A arquitetura Transformer revolucionou o processamento de linguagem natural (PLN) e a inteligência artificial generativa moderna ao dispensar estruturas recorrentes (RNNs) e convolucionais (CNNs) em favor de um mecanismo exclusivo de auto-atenção (Self-Attention).

1. Visão Geral e Motivação
Modelos sequenciais tradicionais como LSTMs e GRUs processam tokens linearmente, criando um gargalo de paralelização computacional e sofrendo com a perda de dependências temporais de longo alcance. O Transformer propõe uma arquitetura codificador-decodificador (encoder-decoder) que opera sobre todas as posições da sequência simultaneamente em batches paralelos.

2. Componentes e Conceitos Arquiteturais
- Multi-Head Attention: Permite ao modelo projetar conjuntamente informações de diferentes subespaços de representação em diferentes posições.
- Positional Encoding: Como a arquitetura não possui recorrência intrínseca nem loops temporais, informações sobre a ordem e distância relativa entre os tokens são adicionadas por funções senoidais ou embeddings aprendidos.
- Feed-Forward Networks (FFN): Camadas totalmente conectadas aplicadas separadamente e de forma idêntica a cada posição após as projeções de atenção.
- Conexões Residuais e Normalização de Camada (LayerNorm): Estabilizam os gradientes durante o treinamento de redes profundas.

3. Tecnologias e Metodologias Envolvidas
- Mecanismo Scaled Dot-Product Attention: Cálculo vetorial Q, K, V (Query, Key, Value) ponderado pela raiz quadrada da dimensão.
- Otimizador Adam com taxa de aprendizado com aquecimento (warm-up) e decaimento inverso.
- Treinamento Massivo em GPUs e TPUs com bfloat16/float16.

4. Impacto e Conclusão
O Transformer pavimentou o caminho para a era dos Large Language Models (LLMs) como a família Gemini, GPT e BERT, demonstrando que a atenção pura supera arquiteturas recorrentes tanto em acurácia tradutória quanto em eficiência de escalonamento computacional. O principal desafio remanescente é a complexidade quadrática O(N²) da auto-atenção tradicional em relação ao comprimento da sequência de contexto.`,
  },
  {
    id: "event-driven-arch",
    title: "Arquitetura Orientada a Eventos e Microserviços Resilientes",
    category: "Engenharia de Software",
    sourceName: "Documentação: Padrões de Event-Driven Architecture (EDA)",
    url: "https://martinfowler.com/articles/201701-event-driven.html",
    text: `A Arquitetura Orientada a Eventos (EDA - Event-Driven Architecture) é um paradigma de design de software em que os componentes do sistema se comunicam por meio da emissão, detecção e consumo de eventos assíncronos.

1. Visão Geral e Contexto
Em arquiteturas de microserviços síncronas baseadas em chamadas HTTP/REST diretas, os serviços sofrem com acoplamento temporal e o risco de falhas em cascata. Quando um serviço intermediário fica instável, a latência de toda a cadeia de requisições aumenta dramaticamente. A abordagem orientada a eventos resolve este problema desacoplando produtores de consumidores através de um Event Broker distribuído.

2. Principais Padrões e Conceitos
- Event Sourcing: O estado de uma entidade de negócio não é armazenado como snapshot atualizado, mas sim como uma sequência imutável de eventos de domínio que podem ser reproduzidos a qualquer instante para auditoria ou recuperação.
- CQRS (Command Query Responsibility Segregation): Separação explícita entre modelos de escrita (comandos que modificam dados) e modelos de leitura (visões otimizadas para consulta rápida).
- Padrão Saga: Coordenação de transações distribuídas através de coreografia ou orquestração de eventos, garantindo consistência eventual sem locking de bancos de dados distribuídos.
- Outbox Pattern: Garante consistência transacional entre a gravação no banco de dados relacional e a publicação da mensagem no broker.

3. Tecnologias e Ferramentas
- Brokers de Mensageria: Apache Kafka, RabbitMQ, AWS SQS/SNS e Google Cloud Pub/Sub.
- Esquemas de Mensagem: Apache Avro, Protobuf e JSON Schema com Schema Registry.
- Bancos de dados: PostgreSQL com CDC (Change Data Capture) via Debezium.

4. Conclusão e Trade-offs
A EDA oferece escalabilidade horizontal incomparável, tolerância a falhas e independência de deploy para equipes ágeis. Em contrapartida, impõe maior complexidade operacional, necessidade de idempotência em todos os consumidores, tratamento de mensagens duplicadas e monitoramento avançado de latência em filas assíncronas.`,
  }
];
