import { describe, expect, it } from 'vitest';
import {
  SYMBOL_SHAPES,
  generateLineSymbolSvg,
  generateStationNumberSvg,
  generateSymbolSvg,
  generateTransferSymbolSvg,
} from './symbol-design.js';

/** @returns {import('./types/common.js').SymbolDesign} */
function makeSymbolDesign(overrides = {}) {
  return {
    symbolDesignId: 1,
    designCode: 'LINE_CIRCLE',
    designType: 'LINE_SYMBOL',
    name: '円形ラインシンボル',
    shape: 'circle',
    borderStyle: 'solid',
    borderWidth: 2,
    defaultTextColor: '#ffffff',
    defaultBgColor: '#0072bc',
    fontFamily: 'sans-serif',
    aspectRatio: 1,
    ...overrides,
  };
}

describe('generateSymbolSvg', () => {
  it('SVGルート要素とviewBoxを持つマークアップを生成する', () => {
    const svg = generateSymbolSvg(makeSymbolDesign(), { text: 'TO' });
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+(\.\d+)? \d+(\.\d+)?"/,
    );
    expect(svg).toContain('</svg>');
  });

  it('指定したテキストを<text>要素に含める', () => {
    const svg = generateSymbolSvg(makeSymbolDesign(), { text: 'JY' });
    expect(svg).toContain('>JY</text>');
  });

  it('textを省略した場合は空文字として扱う', () => {
    const svg = generateSymbolSvg(makeSymbolDesign());
    expect(svg).toContain('><text');
  });

  it('未対応のshapeを指定するとエラーになる', () => {
    expect(() => generateSymbolSvg(makeSymbolDesign({ shape: 'triangle' }), { text: 'X' })).toThrow(
      '未対応の形状です',
    );
  });

  it('shapeが指定されていない場合はエラーになる', () => {
    expect(() => generateSymbolSvg({}, { text: 'X' })).toThrow('symbolDesign.shapeが必要です');
  });

  it('背景色・文字色のいずれも決定できない場合はエラーになる', () => {
    const design = makeSymbolDesign({ defaultBgColor: undefined, defaultTextColor: undefined });
    expect(() => generateSymbolSvg(design, { text: 'X' })).toThrow(
      '背景色・文字色を決定できません',
    );
  });

  describe('5種類の形状すべてに対応する', () => {
    it.each(SYMBOL_SHAPES)('shape=%s のSVGを生成できる', (shape) => {
      const svg = generateSymbolSvg(makeSymbolDesign({ shape }), { text: 'A' });
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('circleは<circle>要素を使う', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ shape: 'circle' }), { text: 'A' });
      expect(svg).toMatch(/<circle /);
    });

    it('ellipseは<ellipse>要素を使う', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ shape: 'ellipse', aspectRatio: 1.6 }), {
        text: 'A',
      });
      expect(svg).toMatch(/<ellipse /);
    });

    it('squareとrounded_squareは<rect>要素を使い、角丸のみrxを持つ', () => {
      const square = generateSymbolSvg(makeSymbolDesign({ shape: 'square' }), { text: 'A' });
      const roundedSquare = generateSymbolSvg(makeSymbolDesign({ shape: 'rounded_square' }), {
        text: 'A',
      });
      expect(square).toMatch(/<rect /);
      expect(square).not.toMatch(/<rect[^>]*rx=/);
      expect(roundedSquare).toMatch(/<rect[^>]*rx="[^0"][^"]*"/);
    });

    it('hexagonは6頂点の<polygon>要素を使う', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ shape: 'hexagon' }), { text: 'A' });
      const match = svg.match(/<polygon points="([^"]+)"/);
      expect(match).not.toBeNull();
      const points = match[1].trim().split(/\s+/);
      expect(points).toHaveLength(6);
    });
  });

  describe('aspectRatioによる縦横比', () => {
    it('aspectRatio=1のとき正方形のviewBoxになる（円・正方形）', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ aspectRatio: 1 }), { text: 'A' });
      const match = svg.match(/viewBox="0 0 (\S+) (\S+)"/);
      expect(Number(match[1])).toBeCloseTo(Number(match[2]));
    });

    it('aspectRatioが1超のとき横長のviewBoxになる（楕円等）', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ shape: 'ellipse', aspectRatio: 2 }), {
        text: 'A',
      });
      const match = svg.match(/viewBox="0 0 (\S+) (\S+)"/);
      expect(Number(match[1])).toBeGreaterThan(Number(match[2]));
    });

    it('0以下のaspectRatioはエラーになる', () => {
      expect(() => generateSymbolSvg(makeSymbolDesign({ aspectRatio: 0 }), { text: 'A' })).toThrow(
        'aspectRatio',
      );
    });
  });

  describe('配色の決定', () => {
    it('contentを省略した場合はSYMBOL_DESIGNの既定配色を使う', () => {
      const svg = generateSymbolSvg(makeSymbolDesign(), { text: 'A' });
      expect(svg).toContain('fill="#0072bc"');
      expect(svg).toContain('fill="#ffffff"');
    });

    it('個別指定色（bgColor/textColor）が既定配色を上書きする', () => {
      const svg = generateSymbolSvg(makeSymbolDesign(), {
        text: 'A',
        bgColor: '#ff0000',
        textColor: '#00ff00',
      });
      expect(svg).toContain('fill="#ff0000"');
      expect(svg).toContain('fill="#00ff00"');
      expect(svg).not.toContain('fill="#0072bc"');
      expect(svg).not.toContain('fill="#ffffff"');
    });

    it('bgColorのみを上書きした場合、textColorは既定値のまま使われる', () => {
      const svg = generateSymbolSvg(makeSymbolDesign(), { text: 'A', bgColor: '#ff0000' });
      expect(svg).toContain('fill="#ff0000"');
      expect(svg).toContain('fill="#ffffff"');
    });
  });

  describe('枠線', () => {
    it('borderWidthが指定されている場合はstroke属性を持つ', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ borderStyle: 'solid', borderWidth: 3 }), {
        text: 'A',
      });
      expect(svg).toContain('stroke-width="3"');
    });

    it('borderWidthが0の場合はstroke="none"になる', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ borderWidth: 0 }), { text: 'A' });
      expect(svg).toContain('stroke="none"');
    });

    it('borderStyle=dashedの場合はstroke-dasharrayを持つ', () => {
      const svg = generateSymbolSvg(makeSymbolDesign({ borderStyle: 'dashed', borderWidth: 2 }), {
        text: 'A',
      });
      expect(svg).toContain('stroke-dasharray=');
    });
  });

  describe('XMLエスケープ', () => {
    it('テキスト中の特殊文字をエスケープする', () => {
      const svg = generateSymbolSvg(makeSymbolDesign(), { text: '<A&B>' });
      expect(svg).toContain('&lt;A&amp;B&gt;');
      expect(svg).not.toContain('<A&B>');
    });

    it('色指定中の特殊文字（属性値）をエスケープする', () => {
      const svg = generateSymbolSvg(makeSymbolDesign(), {
        text: 'A',
        bgColor: '"><script>alert(1)</script>',
      });
      expect(svg).not.toContain('<script>');
    });
  });

  describe('svgTemplateによるカスタム形状', () => {
    it('svgTemplateが指定されている場合はプレースホルダーを置換して返す', () => {
      const design = makeSymbolDesign({
        svgTemplate:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {{width}} {{height}}"><rect width="{{width}}" height="{{height}}" fill="{{bgColor}}"/><text fill="{{textColor}}">{{text}}</text></svg>',
      });
      const svg = generateSymbolSvg(design, {
        text: 'JY',
        bgColor: '#123456',
        textColor: '#abcdef',
      });
      expect(svg).toContain('fill="#123456"');
      expect(svg).toContain('fill="#abcdef"');
      expect(svg).toContain('>JY</text>');
      expect(svg).not.toContain('{{');
    });

    it('bgColor/textColor/fontFamily中の特殊文字をエスケープする（XSS対策）', () => {
      const design = makeSymbolDesign({
        svgTemplate:
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {{width}} {{height}}"><rect width="{{width}}" height="{{height}}" fill="{{bgColor}}"/><text fill="{{textColor}}" font-family="{{fontFamily}}">{{text}}</text></svg>',
        fontFamily: '"><script>alert(3)</script>',
      });
      const svg = generateSymbolSvg(design, {
        text: 'JY',
        bgColor: '"><script>alert(1)</script>',
        textColor: '"><script>alert(2)</script>',
      });
      expect(svg).not.toContain('<script>');
      expect(svg).toContain('&lt;script&gt;');
    });
  });
});

describe('generateLineSymbolSvg', () => {
  it('LINE_SYMBOLのsymbolText/lineColor/textColorを反映する', () => {
    const symbolDesign = makeSymbolDesign();
    const lineSymbol = {
      lineSymbolId: 1,
      lineId: 1,
      symbolDesignId: 1,
      symbolText: 'TO',
      lineColor: '#0072BC',
      textColor: '#FFFFFF',
      displayOrder: 1,
    };
    const svg = generateLineSymbolSvg(symbolDesign, lineSymbol);
    expect(svg).toContain('>TO</text>');
    expect(svg).toContain('fill="#0072BC"');
    expect(svg).toContain('fill="#FFFFFF"');
  });
});

describe('generateStationNumberSvg', () => {
  it('STATION_NUMBERのprefix/numberを連結し、lineColorを背景色に使う', () => {
    const symbolDesign = makeSymbolDesign({ designType: 'STATION_NUMBER' });
    const stationNumber = {
      stationNumberId: 1,
      lineStationId: 1,
      symbolDesignId: 1,
      prefix: 'TO',
      number: '01',
      lineColor: '#0072BC',
      displayOrder: 1,
    };
    const svg = generateStationNumberSvg(symbolDesign, stationNumber);
    expect(svg).toContain('>TO-01</text>');
    expect(svg).toContain('fill="#0072BC"');
    // STATION_NUMBERにtextColorは無いため、SYMBOL_DESIGNの既定文字色が使われる
    expect(svg).toContain('fill="#ffffff"');
  });
});

describe('generateTransferSymbolSvg', () => {
  it('TRANSFER_SYMBOLのsymbolText/lineColor/textColorを反映する', () => {
    const symbolDesign = makeSymbolDesign();
    const transferSymbol = {
      transferSymbolId: 1,
      transferId: 1,
      symbolDesignId: 1,
      symbolText: 'MRT',
      lineColor: '#F39800',
      textColor: '#FFFFFF',
      displayOrder: 1,
    };
    const svg = generateTransferSymbolSvg(symbolDesign, transferSymbol);
    expect(svg).toContain('>MRT</text>');
    expect(svg).toContain('fill="#F39800"');
    expect(svg).toContain('fill="#FFFFFF"');
  });
});
