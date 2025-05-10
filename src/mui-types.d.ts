import '@mui/material/ListItem';

declare module '@mui/material/ListItem' {
  interface ListItemTypeMap {
    props: {
      button?: boolean;
    } & ListItemTypeMap['props'];
  }
}

// Para evitar errores de propiedad en objetos
declare global {
  interface Object {
    [key: string]: any;
  }
} 