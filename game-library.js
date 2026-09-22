export const BIBLIOTECA_JOGOS = [
  {
    categoria:"Plataformas e motores",
    itens:[
      {nome:"Microsoft MakeCode Arcade",descricao:"Criação de jogos com JavaScript/TypeScript e Python, com foco educacional e desenvolvimento de jogos.",url:"https://arcade.makecode.com/"},
      {nome:"microStudio",descricao:"Engine online com editores integrados de código, sprites e mapas para prototipagem 2D.",url:"https://microstudio.dev/"},
      {nome:"TIC-80",descricao:"Computador de fantasia open source com ferramentas integradas para código, sprites, mapas e som.",url:"https://tic80.com/"}
    ]
  },
  {
    categoria:"Assets e bancos de arte",
    itens:[
      {nome:"Kenney Assets",descricao:"Coleção de assets para jogos; páginas de assets do Kenney usam licença CC0.",url:"https://kenney.nl/assets"},
      {nome:"OpenGameArt",descricao:"Comunidade de recursos para jogos com sprites, cenários, áudio e outros assets sob licenças variadas.",url:"https://opengameart.org/"},
      {nome:"Itch.io — Free Game Assets",descricao:"Catálogo comunitário de assets gratuitos para jogos, incluindo sprites, tilesets, personagens e efeitos.",url:"https://itch.io/game-assets/free"}
    ]
  },
  {
    categoria:"Editores de sprites",
    itens:[
      {nome:"Piskel",descricao:"Editor online gratuito para sprites animados e pixel art, com preview e exportação para GIF/PNG/spritesheet.",url:"https://www.piskelapp.com/"},
      {nome:"Pixelorama",descricao:"Ferramenta open source de pixel art com sprites, tiles, camadas, frames e recursos de animação.",url:"https://orama-interactive.itch.io/pixelorama"}
    ]
  }
];

export const todosRecursosDeJogos = () => BIBLIOTECA_JOGOS.flatMap(grupo =>
  grupo.itens.map(item => ({...item,categoria:grupo.categoria}))
);