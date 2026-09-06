# Auditoria de botões do Design System

## Resultado

A auditoria estática revisou as ações do aplicativo e da administração. Botões de ação comuns que ainda possuíam estilos locais foram migrados para os componentes oficiais. Controles compostos continuam especializados quando sua função depende da forma visual, do estado selecionado ou do contexto operacional.

## Componentes oficiais

- `InstitutionalAction`: ação principal, horizontal e de destaque de uma seção.
- `Button`: ações primárias, secundárias, discretas e destrutivas.
- `IconButton`: ações representadas apenas por ícone, sempre com rótulo acessível.
- `PrayerActionButton`: controles próprios do ambiente de chamada.

## Ações corrigidas nesta auditoria

- navegação do guia de uso;
- confirmação de exclusão de publicação;
- resgate e reserva de produtos da Cantina;
- gerenciamento, validação e nomeação de pessoas;
- remoção de papel administrativo;
- edição, alteração de tipo e exclusão na moderação;
- fechamento dos painéis administrativos revisados.

## Exceções intencionais

Podem usar `button` sem o componente genérico:

- abas, filtros, chips, seletores e opções com estado selecionado;
- cards inteiros clicáveis e linhas de navegação;
- controles de quantidade, QR Code, NFC, câmera, áudio e chamada;
- controles editoriais de blocos, ordenação e expansão;
- ações sociais do Mural, por possuírem estados e identidade próprios.

Essas exceções devem consumir tokens do tema e classes semânticas do Design System, preservar foco visível, área de toque e rótulo acessível. Uma nova ação comum não deve receber CSS local quando `Button`, `IconButton` ou `InstitutionalAction` atender ao caso.
