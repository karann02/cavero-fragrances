import { DecoupledEditor } from 'ckeditor5';

// Plugins
import {
  Essentials,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image,
  ImageToolbar,
  ImageStyle,
  MediaEmbed,
  Table,
  TableToolbar,
  SourceEditing
} from 'ckeditor5';

export default class CustomEditor extends DecoupledEditor {
  public static override builtinPlugins = [
    Essentials,
    Heading,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Link,
    Image,
    ImageToolbar,
    ImageStyle,
    MediaEmbed,
    Table,
    TableToolbar,
    SourceEditing
  ];

  public static override defaultConfig = {
    toolbar: {
      items: [
        'heading',
        '|',
        'bold',
        'italic',
        'underline',
        'strikethrough',
        '|',
        'link',
        'mediaEmbed',
        'insertTable',
        '|',
        'undo',
        'redo',
        '|',
        'sourceEditing'
      ]
    },
    language: 'en'
  };
}
