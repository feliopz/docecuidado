-- ============================================================================
-- Doce Cuidado — seed das lições (tabela public.lessons)
-- Equipe Synapse · gerado a partir de docs/content/licoes.md
--
-- FONTE DE VERDADE: docs/content/licoes.md. Não edite este arquivo isoladamente
-- e não edite as lições direto pelo tools/lessons-admin.html sem trazer a
-- mudança de volta para o markdown — foi assim que o conteúdo anterior ficou
-- sem histórico e sem fontes declaradas.
--
-- Conduta clínica ancorada em: SOCIEDADE BRASILEIRA DE ENDOCRINOLOGIA E
-- METABOLOGIA — REGIONAL SÃO PAULO. Guia educacional para população: Diabetes.
-- São Paulo: Gengibre Comunicação, 2025. ISBN 978-65-986752-1-9.
--
-- Rodar com service_role (a policy de escrita não é pública).
-- Idempotente: upsert por id.
-- ============================================================================

-- Campos novos usados pela trilha por público (backlog A-07). Seguros de repetir.
alter table public.lessons add column if not exists audience text not null default 'todos';
alter table public.lessons add column if not exists is_public boolean not null default false;
alter table public.lessons add column if not exists sources text not null default '';

insert into public.lessons (id, title, description, content, icon_svg, order_index, audience, is_public, sources) values

('sinais-alerta',
 'Os sinais que ninguém te contou',
 'Muito xixi, muita sede, perda de peso. Reconhecer cedo evita uma internação.',
 $c$Em cinco das histórias de família que estudamos, a criança foi ao médico por outro motivo — virose, bronquiolite, infecção urinária, dor de garganta — e o diabetes só apareceu quando o quadro já era grave.

OS SINAIS MAIS COMUNS EM CRIANÇAS

• Muito xixi. Volta a fazer xixi na cama depois de já ter parado. Em bebê, a fralda não segura.
• Muita sede. Acorda de madrugada pedindo água. Bebe garrafas inteiras.
• Perder peso sem explicação, mesmo comendo bem — às vezes comendo muito.
• Cansaço. Fica sem energia, quer dormir a toda hora, larga a brincadeira no meio.
• Dor de barriga, enjoo ou vômito.
• Em bebês: recusa alimentar e emagrecimento rápido em quem estava ganhando peso.

O QUE FAZER

Procure atendimento e peça uma medida de glicemia — a ponta de dedo, que leva segundos. Se os sintomas estiverem juntos, isso não pode esperar a próxima consulta.

SINAL DE URGÊNCIA

Respiração rápida e profunda, hálito adocicado ou de acetona, sonolência, confusão ou vômitos que não param. Procure emergência imediatamente — pode ser cetoacidose.

Uma mãe resumiu assim, sobre o filho de 10 meses que passou dias internado: "se tivesse feito pelo menos a ponta de dedo, não teria acontecido isso".

E SE JÁ HÁ DIABETES NA FAMÍLIA

Converse com o pediatra sobre a triagem dos irmãos. Existem exames que identificam o risco antes dos sintomas.$c$,
 '', 1, 'todos', true, 'M01,M02,M03,M05,M06,M09'),

('o-que-e-diabetes',
 'O que é diabetes tipo 1 (e o que não é)',
 'Uma explicação em português comum, sem termo que assusta.',
 $c$O pâncreas produz insulina — o hormônio que deixa a glicose (o açúcar do sangue) entrar nas células para virar energia. No diabetes tipo 1, o corpo para de produzir insulina. Por isso o tratamento é repor essa insulina todos os dias.

Uma menina de 9 anos explicou para uma amiguinha assim: "a minha glicose é um pouco mais alta que a sua". É uma boa definição.

O QUE O TIPO 1 NÃO É

• Não foi por comer doce. É uma condição em que o próprio corpo deixa de produzir insulina. Nenhuma escolha da família causou isso.
• Não é o mesmo que tipo 2. No tipo 2, o corpo produz insulina mas não consegue usá-la direito; costuma aparecer em adultos e o tratamento é diferente.
• Não é só de criança. Existem diagnósticos de tipo 1 aos 60, aos 70 anos.
• Não tem cura — e desconfie de qualquer promessa na internet que diga o contrário.
• Não proíbe comida. Com a contagem de carboidratos e a insulina certa, a criança come de tudo. Pão, batata, massa e fruta continuam na mesa; o que se ajusta é a porção e a dose.

Definições e mitos conforme o Guia Educacional da SBEM-SP (2025).$c$,
 '', 2, 'responsavel', true, 'M09,M01'),

('primeiros-dias',
 'Os primeiros dias em casa',
 'A alta que não parece alta. Por onde começar quando tudo é novo.',
 $c$Uma mãe descreveu a alta hospitalar assim: "é uma alta que não é uma alta — ali tudo está começando". Outra família contou que, no primeiro dia, sentiu vontade de jogar fora tudo que havia no armário — e hoje reconhece que aquilo era o susto falando.

O QUE PRECISA ESTAR RESOLVIDO NA PRIMEIRA SEMANA

1. Onde ficam as coisas. Insulina, glicosímetro, fitas, lancetas e o carboidrato de resgate (suco, mel, balas de glicose) sempre no mesmo lugar. Uma bolsinha pronta para sair de casa.

2. Quem é a equipe. Nome e telefone de quem procurar em dúvida e em emergência, anotados onde todo mundo da casa vê.

3. Uma rotina escrita. Anotar o que foi medido, aplicado e comido, em ordem, do acordar ao dormir. Não é burocracia: é o que permite a equipe de saúde ajustar o tratamento.

4. Mais de uma pessoa treinada. Se só um adulto sabe medir e aplicar, essa pessoa não dorme, não adoece e não sai. Ensine um segundo adulto na primeira semana.

O QUE PODE ESPERAR

Entender tudo. Não dá para aprender diabetes em uma semana, e ninguém aprende. As famílias que acompanhamos levaram meses — e seguem aprendendo.

A recomendação de rotina escrita segue o Guia da SBEM-SP (2025).$c$,
 '', 3, 'responsavel', false, 'M01,M02,M06'),

('hipoglicemia',
 'Hipoglicemia: reconhecer e agir',
 'Abaixo de 70. A regra dos 15. E o que nunca fazer.',
 $c$Hipoglicemia é a glicose abaixo de 70 mg/dL. É a situação mais comum de quem usa insulina, e a que mais assusta — por isso é a que mais precisa estar decorada.

SINAIS

Tremores · suor frio · tontura · coração acelerado · fome intensa · dor de cabeça · confusão ou dificuldade de concentração · irritação e mudança de humor repentina.
Nos casos graves: perda de consciência ou convulsão.

A REGRA DOS 15

1. Ofereça 15 g de carboidrato de ação rápida — 1 copo (150 ml) de suco de laranja, OU 1 colher de sopa de açúcar dissolvido em água, OU 3 a 4 balas de glicose, OU 1 colher de mel.
2. Espere 15 minutos e meça de novo.
3. Se ainda estiver baixa ou os sintomas continuarem, repita.

NUNCA DÊ NADA PELA BOCA

Se a criança estiver desacordada, sonolenta demais, confusa ou sem conseguir engolir — há risco de engasgo. Nessa situação: ligue 192 imediatamente.

TRÊS COISAS QUE AS FAMÍLIAS APRENDERAM NA PRÁTICA

• Deixe ela sentada enquanto o açúcar age. É comum a criança querer voltar a brincar na hora — e a glicemia cair de novo.
• Carboidrato no bolso, não em casa. Trampolim, bicicleta, parque: a queda acontece longe da cozinha.
• Depois da hipo, todo mundo fica abalado. Inclusive quem cuida. Não é fraqueza.

Definição, sintomas e conduta conforme o Guia Educacional da SBEM-SP (2025).$c$,
 '', 4, 'todos', true, 'M09,M01,M03'),

('hiperglicemia-cetonas',
 'Glicemia alta e cetonas',
 'Quando a glicemia sobe e não desce — e como saber se virou urgência.',
 $c$Glicemia alta acontece: comida a mais, dose a menos, doença, estresse, crescimento. Na maior parte das vezes se resolve com o que a equipe de saúde já orientou. O que não é rotina é a glicemia alta que não desce com a correção — aí é preciso procurar cetonas.

Cetonas aparecem quando falta insulina e o corpo passa a queimar gordura para ter energia. Acumuladas, levam à cetoacidose diabética, que é emergência.

SINAIS DE ALERTA

Respiração rápida e profunda · hálito adocicado ou com cheiro de acetona · vômitos · dor de barriga forte · sonolência ou confusão.
Isso é 192, sem hesitar.

SOBRE MEDIR CETONAS

Existem fitas de urina e medidores de cetona no sangue. A fita de urina mostra o que estava acontecendo há algumas horas; o medidor de sangue mostra o agora. Converse com a equipe de saúde sobre qual usar e quando.

ANTES DE CONCLUIR QUE "A DOSE NÃO FUNCIONOU"

Verifique o caminho da insulina. Uma família descobriu, depois de uma noite inteira de glicemia subindo, que a bomba havia descarregado e, ao religar, não tinha reconectado ao sensor — nenhuma insulina havia sido entregue. Outra descobriu que o problema era o local de aplicação, que não estava absorvendo. Caneta com pouca insulina, agulha entupida, sítio irritado e insulina guardada errado dão o mesmo resultado.

GUARDE A INSULINA CERTO

Frasco aberto dura em geral até 28 dias em temperatura ambiente, em local fresco (confira a bula). Frasco fechado vai na geladeira, entre 2 °C e 8 °C, na parte central — nunca na porta.

Conduta e armazenamento conforme o Guia da SBEM-SP (2025). Sobre correções: siga sempre a orientação da sua equipe de saúde — este app não sugere doses.$c$,
 '', 5, 'responsavel', false, 'M09,M08,M03'),

('insulina-timing',
 'Insulina: o tempo é metade da dose',
 'A mesma dose, na hora errada, dá um resultado completamente diferente.',
 $c$Uma mãe passou mais de um ano aplicando a insulina rápida na hora da refeição, achando que era assim. A glicemia subia depois de comer, e quando a insulina finalmente agia, já era hipoglicemia. Nas consultas ela ouvia que precisava "prestar mais atenção" — e chorava, achando que era culpa dela. Não era: era o tempo de ação da insulina que ela usava.

INSULINAS DIFERENTES TÊM TEMPOS DIFERENTES

De forma geral:
• As rápidas costumam ser aplicadas antes da refeição, com alguns minutos de antecedência.
• As ultrarrápidas agem quase imediatamente e podem ser aplicadas na hora de comer — em alguns casos até logo depois.
• As basais (lentas) cobrem o dia todo e têm horário fixo, independente da refeição.

Quem prescreve o tempo é a sua equipe de saúde, e ele muda conforme a insulina. Pergunte na próxima consulta, com estas palavras: "quantos minutos antes da refeição eu aplico esta insulina?" — e anote.

CRIANÇA PEQUENA NÃO COME SOB ENCOMENDA

Esse é o problema real: você aplica para um prato inteiro e ela come metade. Vale levar essa dificuldade concreta à equipe — existem estratégias, como ajustar qual insulina se usa ou dividir a aplicação, que precisam ser orientadas caso a caso.

ANOTE SEMPRE O HORÁRIO

Não só a dose. É a informação que mais ajuda na hora de entender por que um dia deu certo e outro não.

Este app não sugere doses nem horários. As cinco áreas do tratamento — alimentação, exercício, teste de glicose, manejo de hipoglicemias e uso de insulina — são acompanhadas com a equipe de saúde (Guia SBEM-SP, 2025).$c$,
 '', 6, 'responsavel', false, 'M03,M09'),

('sensor-glicemia',
 'Ponta de dedo e sensor: o que cada um mostra',
 'Por que os dois números não batem — e quando confiar em cada um.',
 $c$Uma educadora em diabetes explicou a diferença de um jeito que ficou:

A ponta de dedo é uma foto. O sensor é um vídeo.

A ponta de dedo mede a glicose no sangue, naquele instante. O sensor mede no líquido que fica entre as células — e a glicose leva alguns minutos para chegar lá. Por isso o sensor "é uma fofoqueira atrasada: conta uma história que já passou".

O QUE FAZER COM ISSO

• Quando a glicemia está mudando rápido — depois de comer, durante brincadeira intensa — os dois números vão divergir. É esperado, não é defeito.
• Em jejum ou de madrugada, quando está estável, eles costumam bater.
• Suspeita de hipoglicemia: confirme na ponta de dedo. Assim você não oferece mais açúcar do que o necessário — e não deixa de tratar uma hipo real.

HIPO POR PRESSÃO

Se a criança dormir em cima do sensor, ele pode marcar um valor baixo que não é real. É erro de leitura pela compressão. Antes do susto: ponta de dedo.

OS ALARMES SÃO SEUS

Dá para escolher a partir de qual número avisar, e se vibra ou toca. Alarme que dispara o dia inteiro deixa de ser avisado — vira ruído. Ajuste para o que realmente importa na rotina da sua família.

O sensor contínuo evita furos constantes e alerta hipo e hiperglicemia, mas seu uso deve ser individualizado e orientado por profissionais de saúde (Guia SBEM-SP, 2025).$c$,
 '', 7, 'responsavel', false, 'M03,M09'),

('emocoes-glicemia',
 'Emoção também mexe na glicemia',
 'Susto, raiva e ansiedade sobem a glicose mesmo sem comer nada.',
 $c$Você já sentiu um friozinho na barriga antes de uma prova? Ou ficou tão bravo que o coração acelerou?

Quando a gente sente uma emoção muito forte — raiva, susto, ansiedade, até alegria muito grande — o corpo libera uma energia extra para reagir. Essa energia é glicose. Por isso a glicemia pode subir sem você ter comido nada.

ISSO QUER DIZER QUE

• Não é sempre culpa da comida. Um dia de prova, uma briga ou um susto podem aparecer no número.
• Não é culpa sua. Sentir é do corpo humano, não é erro.
• Vale contar para quem cuida de você. "Hoje eu fiquei muito nervoso" é uma informação tão útil quanto "hoje eu comi bolo".

E quando a cabeça acelera demais, respirar devagar ajuda: puxe o ar contando até quatro, solte contando até seis, três ou quatro vezes. Não muda a glicemia sozinho, mas ajuda você a decidir com calma o que fazer.$c$,
 '', 8, 'crianca', false, 'M04,M09'),

('rotina-diaria',
 'A rotina que cabe na vida real',
 'As cinco áreas do tratamento — sem deixar a vida girar só em torno delas.',
 $c$O tratamento tem cinco áreas: alimentação, exercício físico, teste de glicose, manejo das hipoglicemias e uso da insulina. Elas se sustentam mutuamente — mexer em uma muda as outras.

O QUE FUNCIONA NA PRÁTICA

• Anote em ordem cronológica, do acordar ao dormir. É o que a equipe de saúde usa para ajustar.
• Deixe os materiais em lugares intuitivos — onde você naturalmente lembra de olhar.
• Comer fora dá trabalho porque cardápio não traz carboidrato. Vale ter algumas referências dos pratos que a família mais pede.
• Planejamento, não proibição. Uma família resumiu: "as coisas que a gente achava que não podia mais fazer, a gente pode — só exige um pouco mais de planejamento".

E O MAIS IMPORTANTE

O diabetes precisa ser olhado todos os dias, mas não pode ser o eixo da família inteira. Tem a escola, o trabalho, os irmãos, a vida social. Uma mãe alertou que quando tudo gira em torno do tema, gera ansiedade em todo mundo — principalmente na criança.

As cinco áreas e a recomendação de rotina escrita seguem o Guia da SBEM-SP (2025).$c$,
 '', 9, 'responsavel', false, 'M09,M02,M03'),

('escola',
 'Combinando com a escola',
 'O que a escola precisa saber, por escrito, antes do primeiro dia.',
 $c$Entregar a criança na escola deixa de ser só deixar e ir embora. Vira um combinado — e combinado bom é combinado por escrito.

O QUE PRECISA ESTAR ACERTADO

• Quem mede, quem observa, quem aplica — com nome e substituto.
• Onde ficam o glicosímetro e o carboidrato de resgate. Uma família começou obrigando a criança a ir à enfermaria a cada hipo — ela perdia aula toda vez. Depois passaram a deixar o resgate na própria carteira, e ela só ia à enfermaria nos casos mais sérios.
• Direito a beber água e comer quando precisar, inclusive durante prova.
• O que fazer numa hipo, passo a passo, e quando ligar para a família e para o 192.
• Faltas e atrasos por consulta ou por dia de glicemia difícil não deveriam penalizar a criança.
• Passeios, jogos e atividades fora da escola: quem acompanha e com que material.
• Educação física é para participar. O combinado é medir antes e ter carboidrato à mão — não ficar de fora.

Uma família precisou de carta do endocrinologista para que a filha pudesse manter o celular por perto no time de esportes, porque era ele que mostrava a glicemia. Se encontrar resistência, um documento da equipe de saúde costuma resolver.

O Guia da SBEM-SP inclui, entre as medidas de prevenção de hipoglicemia, avisar familiares e colegas sobre como agir. A escola entra aí.$c$,
 '', 10, 'responsavel', false, 'M08,M02,M09'),

('explicando-para-os-outros',
 'Explicando para os outros',
 'As perguntas que vão aparecer, e respostas curtas que resolvem.',
 $c$Vai acontecer: o comentário na festa, a careta no restaurante, a pergunta na porta da escola. Quase sempre é desinformação, não maldade.

RESPOSTAS CURTAS QUE FUNCIONAM

"Foi de comer muito doce?"
→ Não. No tipo 1 o corpo para de produzir insulina. Não tem a ver com o que ela comeu.

"Ela pode comer isso?"
→ Pode. Com a insulina certa, ela come de tudo — a gente só calcula antes.

"Mas ela está comendo doce agora!"
→ Está corrigindo uma queda de glicemia. Doce, nessa hora, é remédio.

"Isso passa quando ela crescer?"
→ Não passa, mas dá para viver muito bem com isso.

"Não é meio nova para ter diabetes?"
→ O tipo 1 aparece em qualquer idade. Tem gente diagnosticada aos 60, aos 70.

E VOCÊ NÃO É OBRIGADO A EDUCAR TODO DIA

Uma mulher que vive com diabetes há quase 40 anos contou que num dia explicou tudo com paciência para uma senhora que a acusou de estar se drogando no restaurante — e viraram amigas. Em outros dias, respondeu atravessado. E concluiu: "não sou plena todos os dias". Está tudo bem.

Mitos e verdades conforme o Guia da SBEM-SP (2025).$c$,
 '', 11, 'todos', true, 'M01,M09'),

('cuidador',
 'Quem cuida também precisa de cuidado',
 'Exaustão, culpa e a conta que ninguém divide. Pedir ajuda não é fracasso.',
 $c$O material que estudamos é unânime num ponto que quase não se fala: a exaustão de quem cuida é real, e ela compromete o cuidado.

Uma mãe: "eu não durmo. Desde o diagnóstico, eu não consigo dormir". Outra, ao ouvir na consulta que precisava "prestar mais atenção", chorava achando que era incompetente — quando o problema era técnico. Uma psicóloga que também é mãe de uma criança com diabetes descreveu o padrão: a mãe assume a linha de frente inteira, não aceita ajuda, e a sobrecarga vira irritação, que vira uma relação pior com a criança.

TRÊS COISAS QUE MUDAM O JOGO

1. Dividir de verdade. "Pedir ajuda não é sinal de fracasso, é sinal de força." O Guia da SBEM-SP diz o mesmo, com todas as letras: "avalie se é necessário ter ajuda de alguém para coordenar o seu tratamento. Não é vergonha pedir ajuda!" Na prática: treine um segundo adulto, revezem a madrugada, aceitem o oferecimento da avó.

2. Ter um lugar para desabafar que não seja a criança. Uma mãe formulou isso de forma direta: desabafe com outras mães, não com a sua filha. Grupos de famílias, terapia, uma amiga — o que existir. Porque a criança escuta: quando o adulto repete "eu odeio o diabetes", a criança aprende a dizer "eu odeio o diabetes" — e é ela quem vive com ele.

3. Ser pessoa antes de ser cuidador. A terapeuta de uma das mães entrevistadas disse: "você precisa de um espaço para ser você — sem ser mãe, sem ser esposa, sem ser filha".

SINAL DE ALERTA

A depressão é duas a três vezes mais frequente em pessoas que convivem com diabetes, e a maioria dos casos não é diagnosticada. Cansaço excessivo, alteração do sono, perda de interesse e queda no autocuidado merecem avaliação profissional — em quem tem diabetes e em quem cuida.

E, para a criança: ela não precisa gostar de ter diabetes. Precisa poder dizer que está difícil.

Dados sobre depressão e a recomendação de pedir ajuda: Guia Educacional da SBEM-SP (2025).$c$,
 '', 12, 'responsavel', false, 'M01,M03,M08,M09'),

('autonomia',
 'Autonomia, um passo de cada vez',
 'Como entregar o cuidado à criança sem largar a mão.',
 $c$Uma mãe descreveu o mecanismo com precisão: "quanto mais liberdade eu dei, mais independente ela ficou". Aos 10 anos, a filha pesquisava sozinha o carboidrato do lanche e lia rótulo antes de comer.

E O COMBINADO QUE MAIS ENSINA

Essa mesma menina pediu à mãe que não mandasse mensagem assim que a glicemia começasse a cair — "me avisa quando eu chegar nos 60; me dá a chance de resolver primeiro". A mãe aceitou. Parou de precisar avisar.

UMA ESCADA POSSÍVEL

• Reconhecer o que está sentindo e avisar um adulto.
• Participar — segurar o aparelho, escolher o dedo, apertar o botão.
• Medir sozinha, com o adulto por perto.
• Contar carboidrato com apoio, depois sozinha.
• Aplicar, primeiro conferindo a dose com o adulto.
• Decidir o que fazer numa hipo leve, e avisar depois.

A idade de cada degrau é da sua criança, não do calendário.

SOBRE A ADOLESCÊNCIA

Uma mulher que vive com diabetes desde os 11 anos e hoje recebe mensagens de adolescentes foi direta: quando a autonomia não é dada, o adolescente a toma escondido. E aí ninguém mais sabe o que está acontecendo. Vale mais negociar cedo do que descobrir tarde.

O QUE NÃO DELEGAR

A criança não deveria carregar sozinha o peso emocional. Uma adulta que foi diagnosticada aos 11 contou que assumiu, ainda criança, "uma responsabilidade que talvez não fosse minha, para poupar os meus pais de um sofrimento que eu sabia que existia". Autonomia técnica, sim. Solidão, não.$c$,
 '', 13, 'responsavel', false, 'M01,M08')

on conflict (id) do update set
  title       = excluded.title,
  description = excluded.description,
  content     = excluded.content,
  order_index = excluded.order_index,
  audience    = excluded.audience,
  is_public   = excluded.is_public,
  sources     = excluded.sources;

-- NÃO incluída neste seed: 'direitos-sus'. Depende de informação normativa que
-- varia por estado e município; publicar só após revisão jurídica/assistencial.
-- Texto pronto em docs/content/licoes.md (lição 13), backlog C-13.

-- icon_svg fica vazio de propósito: o app faz fallback para o ícone 'book'
-- (ver LessonIcon em src/app/(tabs)/aprender.tsx). Preencher no lessons-admin.
