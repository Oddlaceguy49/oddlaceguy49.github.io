import { BasicSerializableObject, COLOR_ITEM_SINGLETONS, globalConfig, LogicGateSystem, makeOffscreenBuffer, ShapeDefinition, smoothenDpi, THEME, types } from "../types/shapez.js";
import { SzLayer, SzInfo } from "./layer.js";
import { SzContext2D } from "./SzContext2D.js";
export class SzDefinition extends BasicSerializableObject {
    static getId() {
        return "sz-definition";
    }
    static createTest() {
        return new SzDefinition({
            layers: [SzLayer.createTest()],
        });
    }
    constructor(data, clone = false) {
        super();
        if (typeof data == 'string')
            return SzDefinition.fromShortKey(data);
        if (data?.layers)
            this.layers = data.layers.map((e, i) => new SzLayer(e, i));
        if (!this.layers.every(e => e.isNormalized())) {
            this.layers = SzDefinition.createTest().layers;
        }
        // console.log(this.getHash())
        if (clone)
            return;
        if (SzDefinition.definitionCache.has(this.getHash())) {
            return SzDefinition.definitionCache.get(this.getHash());
        }
        console.log(this.getHash());
    }
    layers = [];
    cachedHash = '';
    bufferGenerator;
    getClonedLayers() {
        throw new Error("Method not implemented.");
    }
    isEntirelyEmpty() {
        return this.layers.every(e => e.isEmpty());
    }
    getHash() {
        if (this.cachedHash)
            return this.cachedHash;
        if (!this.layers.length)
            debugger;
        return this.cachedHash = this.layers.map(e => e.getHash()).join(':');
    }
    drawFullSizeOnCanvas(context, size) {
        this.internalGenerateShapeBuffer(null, context, size, size, 1);
    }
    generateAsCanvas(size = 120) {
        const [canvas, context] = makeOffscreenBuffer(size, size, {
            smooth: true,
            label: "definition-canvas-cache-" + this.getHash(),
            reusable: false,
        });
        this.internalGenerateShapeBuffer(canvas, context, size, size, 1);
        return canvas;
    }
    cloneFilteredByQuadrants(includeQuadrants) {
        let layers = this.layers.map(e => e.cloneFilteredByQuadrants(includeQuadrants)).filter(e => !e.isEmpty());
        return new SzDefinition({ layers });
    }
    cloneRotateCW() {
        return new SzDefinition({
            layers: this.layers.map(l => l.clone().rotate(4))
        });
    }
    cloneRotate24(n) {
        return new SzDefinition({
            layers: this.layers.map(l => l.clone().rotate(n))
        });
    }
    cloneRotateCCW() {
        return new SzDefinition({
            layers: this.layers.map(l => l.clone().rotate(24 - 4))
        });
    }
    cloneRotate180() {
        return new SzDefinition({
            layers: this.layers.map(l => l.clone().rotate(12))
        });
    }
    cloneAndStackWith(upper) {
        let bottom = this.clone(e => e.removeCover()).layers;
        let top = upper.clone().layers;
        let dh = 0;
        dhloop: for (dh = 5; dh > 0; dh--) {
            for (let iBottom = 0; iBottom < bottom.length; iBottom++) {
                let iTop = iBottom - dh + 1;
                let can = bottom[iBottom].canStackWith(top[iTop]);
                console.log({
                    iBottom,
                    iTop, can
                });
                if (!can)
                    break dhloop;
            }
        }
        let overlap = bottom.length - dh;
        let newLayers = bottom.map((l, i) => {
            return l.stackWith(top[i - dh]);
        }).concat(top.slice(overlap));
        return new SzDefinition({ layers: newLayers.slice(0, 4) });
    }
    cloneAndPaintWith(color) {
        let rawPaints = Array(24).fill(color);
        if (color == 'purple')
            color = 'pink';
        return this.clone((l, i, a) => l.clone().paint(color));
        // return this.clone((l, i, a) => {
        // 	let paints = a.slice(i).reduceRight((v, e) => e.filterPaint(v), rawPaints);
        // 	return l.removeCover().paint(paints);
        // });
    }
    cloneAndPaintWith4Colors(colors) {
        throw new Error("Method not implemented.");
    }
    cloneAndMakeCover() {
        return new SzDefinition({ layers: this.layers.map(e => e.cloneAsCover()) });
    }
    clone(layerMapper) {
        if (layerMapper) {
            return new SzDefinition({
                layers: this.layers.map(e => e.clone()).flatMap((e, i, a) => {
                    return layerMapper(e, i, a) || [];
                }).filter(e => !e.isEmpty())
            });
        }
        return new SzDefinition(this, true);
    }
    static getSchema() {
        return types.string;
    }
    serialize() {
        return this.getHash();
    }
    deserialize(data, root) {
        console.log('deser', this);
    }
    // inherited
    drawCentered(x, y, parameters, diameter) {
        const dpi = smoothenDpi(globalConfig.shapesSharpness * parameters.zoomLevel);
        if (!this.bufferGenerator) {
            this.bufferGenerator = this.internalGenerateShapeBuffer.bind(this);
        }
        const key = diameter + "/" + dpi + "/" + this.cachedHash;
        const canvas = parameters.root.buffers.getForKey({
            key: "shapedef",
            subKey: key,
            w: diameter,
            h: diameter,
            dpi,
            redrawMethod: this.bufferGenerator,
        });
        parameters.context.drawImage(canvas, x - diameter / 2, y - diameter / 2, diameter, diameter);
    }
    internalGenerateShapeBuffer(canvas, ctx, w, h, dpi) {
        // prepare context
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 0.05;
        ctx.translate((w * dpi) / 2, (h * dpi) / 2);
        ctx.scale((dpi * w) / 2.3, (dpi * h) / 2.3);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = THEME.items.outline;
        ctx.lineWidth = THEME.items.outlineWidth / 10;
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = THEME.items.circleBackground;
        ctx.beginPath();
        ctx.arc(0, 0, 1.15, 0, 2 * Math.PI);
        ctx.fill();
        let sCtx = new SzContext2D(ctx);
        this.layers.forEach((l, i) => l.drawCenteredLayerScaled(sCtx, i));
    }
    static rawHashMap = new Map();
    static getHashfromRawHash(hash) {
        if (!this.rawHashMap.has(hash)) {
            this.rawHashMap.set(hash, SzDefinition.fromShortKey(hash).getHash());
        }
        return this.rawHashMap.get(hash);
    }
    static fromRawShape(shapeDefinition) {
        if (typeof shapeDefinition != 'string')
            shapeDefinition = shapeDefinition.getHash();
        return new SzDefinition({
            layers: shapeDefinition.split(':').map(e => SzLayer.fromShortKey(e))
        });
    }
    static definitionCache = new Map();
    static fromShortKey(key) {
        if (!this.definitionCache.has(key)) {
            this.definitionCache.set(key, new SzDefinition({
                layers: key.split(':').map(e => SzLayer.fromShortKey(e))
            }));
        }
        return this.definitionCache.get(key);
    }
    compute_ANALYZE(root) {
        let firstQuad = this.layers[0].quads[0];
        if (firstQuad.from != 0)
            return [null, null];
        let definition = new SzDefinition({ layers: [SzInfo.quad.exampleLayer(firstQuad.shape)] });
        // @ts-expect-error
        let color = enumShortcodeToColor[SzInfo.color.byName[firstQuad.color].code];
        return [
            COLOR_ITEM_SINGLETONS[color],
            root.shapeDefinitionMgr.getShapeItemFromDefinition(definition),
        ];
    }
    static install(mod) {
        mod.modInterface.extendObject(ShapeDefinition, ({ $old }) => ({
            fromShortKey(key) {
                return SzDefinition.fromShortKey(key);
            },
            isValidShortKey(key) {
                try {
                    SzDefinition.fromShortKey(key);
                    return true;
                }
                catch (e) {
                    return false;
                }
            }
        }));
        mod.modInterface.extendClass(LogicGateSystem, ({ $old }) => ({
            compute_ANALYZE(parameters) {
                let item = parameters[0];
                if (!item || item.getItemType() !== "shape") {
                    // Not a shape
                    return [null, null];
                }
                let def = item.definition;
                if (def instanceof SzDefinition) {
                    return def.compute_ANALYZE(this.root);
                }
                return $old.compute_ANALYZE.call(this, parameters);
            }
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmaW5pdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJAZGltYXZhL2hleGFnb25hbC8iLCJzb3VyY2VzIjpbInNoYXBlc3QvZGVmaW5pdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQVksdUJBQXVCLEVBQUUscUJBQXFCLEVBQTRCLFlBQVksRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQU8sZUFBZSxFQUF5QixXQUFXLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3BQLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFTLE1BQU0sWUFBWSxDQUFDO0FBQ3BELE9BQU8sRUFBYyxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUkzRCxNQUFNLE9BQU8sWUFBYSxTQUFRLHVCQUF1QjtJQUN4RCxNQUFNLENBQUMsS0FBSztRQUNYLE9BQU8sZUFBZSxDQUFDO0lBQ3hCLENBQUM7SUFFRCxNQUFNLENBQUMsVUFBVTtRQUNoQixPQUFPLElBQUksWUFBWSxDQUFDO1lBQ3ZCLE1BQU0sRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztTQUM5QixDQUFDLENBQUM7SUFDSixDQUFDO0lBSUQsWUFBWSxJQUFvRCxFQUFFLEtBQUssR0FBRyxLQUFLO1FBQzlFLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxPQUFPLElBQUksSUFBSSxRQUFRO1lBQUUsT0FBTyxZQUFZLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BFLElBQUksSUFBSSxFQUFFLE1BQU07WUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0UsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMs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Q1o7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1gsT0FBTyxLQUFLLENBQUM7aUJBQ2I7WUFDRixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7UUFFSixHQUFHLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQzVELGVBQWUsQ0FBQyxVQUFVO2dCQUN6QixJQUFJLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLE9BQU8sRUFBRTtvQkFDNUMsY0FBYztvQkFDZCxPQUFPLENBQUMsSUFBdUIsRUFBRSxJQUF1QixDQUFDLENBQUM7aUJBQzFEO2dCQUNELElBQUksR0FBRyxHQUFJLElBQWtCLENBQUMsVUFBVSxDQUFDO2dCQUN6QyxJQUFJLEdBQUcsWUFBWSxZQUFZLEVBQUU7b0JBQ2hDLE9BQU8sR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFRLENBQUM7aUJBQzlDO2dCQUNELE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ3BELENBQUM7U0FDRCxDQUFDLENBQUMsQ0FBQTtJQUVKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlSXRlbSwgQmFzaWNTZXJpYWxpemFibGVPYmplY3QsIENPTE9SX0lURU1fU0lOR0xFVE9OUywgRHJhd1BhcmFtZXRlcnMsIEdhbWVSb290LCBnbG9iYWxDb25maWcsIExvZ2ljR2F0ZVN5c3RlbSwgbWFrZU9mZnNjcmVlbkJ1ZmZlciwgTW9kLCBTaGFwZURlZmluaXRpb24sIFNoYXBlSXRlbSwgU2hhcGVMYXllciwgc21vb3RoZW5EcGksIFRIRU1FLCB0eXBlcyB9IGZyb20gXCIuLi90eXBlcy9zaGFwZXouanNcIjtcclxuaW1wb3J0IHsgU3pMYXllciwgU3pJbmZvLCBjb2xvciB9IGZyb20gXCIuL2xheWVyLmpzXCI7XHJcbmltcG9ydCB7IHJvdGF0aW9uMjQsIFN6Q29udGV4dDJEIH0gZnJvbSBcIi4vU3pDb250ZXh0MkQuanNcIjtcclxuXHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFN6RGVmaW5pdGlvbiBleHRlbmRzIEJhc2ljU2VyaWFsaXphYmxlT2JqZWN0IGltcGxlbWVudHMgU2hhcGVEZWZpbml0aW9uIHtcclxuXHRzdGF0aWMgZ2V0SWQoKSB7XHJcblx0XHRyZXR1cm4gXCJzei1kZWZpbml0aW9uXCI7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgY3JlYXRlVGVzdCgpIHtcclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHtcclxuXHRcdFx0bGF5ZXJzOiBbU3pMYXllci5jcmVhdGVUZXN0KCldLFxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHJcblxyXG5cdGNvbnN0cnVjdG9yKGRhdGE/OiB7IGxheWVyczogU3pMYXllcltdIH0gfCBTekRlZmluaXRpb24gfCBzdHJpbmcsIGNsb25lID0gZmFsc2UpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHRpZiAodHlwZW9mIGRhdGEgPT0gJ3N0cmluZycpIHJldHVybiBTekRlZmluaXRpb24uZnJvbVNob3J0S2V5KGRhdGEpO1xyXG5cdFx0aWYgKGRhdGE/LmxheWVycykgdGhpcy5sYXllcnMgPSBkYXRhLmxheWVycy5tYXAoKGUsIGkpID0+IG5ldyBTekxheWVyKGUsIGkpKTtcclxuXHRcdGlmICghdGhpcy5sYXllcnMuZXZlcnkoZSA9PiBlLmlzTm9ybWFsaXplZCgpKSkge1xyXG5cdFx0XHR0aGlzLmxheWVycyA9IFN6RGVmaW5pdGlvbi5jcmVhdGVUZXN0KCkubGF5ZXJzO1xyXG5cdFx0fVxyXG5cdFx0Ly8gY29uc29sZS5sb2codGhpcy5nZXRIYXNoKCkpXHJcblx0XHRpZiAoY2xvbmUpIHJldHVybjtcclxuXHRcdGlmIChTekRlZmluaXRpb24uZGVmaW5pdGlvbkNhY2hlLmhhcyh0aGlzLmdldEhhc2goKSkpIHtcclxuXHRcdFx0cmV0dXJuIFN6RGVmaW5pdGlvbi5kZWZpbml0aW9uQ2FjaGUuZ2V0KHRoaXMuZ2V0SGFzaCgpKSE7XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyh0aGlzLmdldEhhc2goKSk7XHJcblx0fVxyXG5cclxuXHJcblxyXG5cdGxheWVyczogU3pMYXllcltdID0gW107XHJcblx0Y2FjaGVkSGFzaDogc3RyaW5nID0gJyc7XHJcblx0YnVmZmVyR2VuZXJhdG9yOiBhbnk7XHJcblx0Z2V0Q2xvbmVkTGF5ZXJzKCk6IFNoYXBlTGF5ZXJbXSB7XHJcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJNZXRob2Qgbm90IGltcGxlbWVudGVkLlwiKTtcclxuXHR9XHJcblx0aXNFbnRpcmVseUVtcHR5KCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMubGF5ZXJzLmV2ZXJ5KGUgPT4gZS5pc0VtcHR5KCkpO1xyXG5cdH1cclxuXHRnZXRIYXNoKCk6IHN0cmluZyB7XHJcblx0XHRpZiAodGhpcy5jYWNoZWRIYXNoKSByZXR1cm4gdGhpcy5jYWNoZWRIYXNoO1xyXG5cdFx0aWYgKCF0aGlzLmxheWVycy5sZW5ndGgpIGRlYnVnZ2VyO1xyXG5cdFx0cmV0dXJuIHRoaXMuY2FjaGVkSGFzaCA9IHRoaXMubGF5ZXJzLm1hcChlID0+IGUuZ2V0SGFzaCgpKS5qb2luKCc6Jyk7XHJcblx0fVxyXG5cdGRyYXdGdWxsU2l6ZU9uQ2FudmFzKGNvbnRleHQ6IENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCwgc2l6ZTogbnVtYmVyKTogdm9pZCB7XHJcblx0XHR0aGlzLmludGVybmFsR2VuZXJhdGVTaGFwZUJ1ZmZlcihudWxsIGFzIGFueSwgY29udGV4dCwgc2l6ZSwgc2l6ZSwgMSk7XHJcblx0fVxyXG5cdGdlbmVyYXRlQXNDYW52YXMoc2l6ZSA9IDEyMCkge1xyXG5cdFx0Y29uc3QgW2NhbnZhcywgY29udGV4dF0gPSBtYWtlT2Zmc2NyZWVuQnVmZmVyKHNpemUsIHNpemUsIHtcclxuXHRcdFx0c21vb3RoOiB0cnVlLFxyXG5cdFx0XHRsYWJlbDogXCJkZWZpbml0aW9uLWNhbnZhcy1jYWNoZS1cIiArIHRoaXMuZ2V0SGFzaCgpLFxyXG5cdFx0XHRyZXVzYWJsZTogZmFsc2UsXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmludGVybmFsR2VuZXJhdGVTaGFwZUJ1ZmZlcihjYW52YXMsIGNvbnRleHQsIHNpemUsIHNpemUsIDEpO1xyXG5cdFx0cmV0dXJuIGNhbnZhcztcclxuXHR9XHJcblx0Y2xvbmVGaWx0ZXJlZEJ5UXVhZHJhbnRzKGluY2x1ZGVRdWFkcmFudHM6IG51bWJlcltdKTogU2hhcGVEZWZpbml0aW9uIHtcclxuXHRcdGxldCBsYXllcnMgPSB0aGlzLmxheWVycy5tYXAoZSA9PiBlLmNsb25lRmlsdGVyZWRCeVF1YWRyYW50cyhpbmNsdWRlUXVhZHJhbnRzKSkuZmlsdGVyKGUgPT4gIWUuaXNFbXB0eSgpKTtcclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHsgbGF5ZXJzIH0pO1xyXG5cdH1cclxuXHRjbG9uZVJvdGF0ZUNXKCk6IFNoYXBlRGVmaW5pdGlvbiB7XHJcblx0XHRyZXR1cm4gbmV3IFN6RGVmaW5pdGlvbih7XHJcblx0XHRcdGxheWVyczogdGhpcy5sYXllcnMubWFwKGwgPT4gbC5jbG9uZSgpLnJvdGF0ZSg0KSlcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRjbG9uZVJvdGF0ZTI0KG46IHJvdGF0aW9uMjQpOiBTekRlZmluaXRpb24ge1xyXG5cdFx0cmV0dXJuIG5ldyBTekRlZmluaXRpb24oe1xyXG5cdFx0XHRsYXllcnM6IHRoaXMubGF5ZXJzLm1hcChsID0+IGwuY2xvbmUoKS5yb3RhdGUobikpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Y2xvbmVSb3RhdGVDQ1coKTogU2hhcGVEZWZpbml0aW9uIHtcclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHtcclxuXHRcdFx0bGF5ZXJzOiB0aGlzLmxheWVycy5tYXAobCA9PiBsLmNsb25lKCkucm90YXRlKDI0IC0gNCkpXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Y2xvbmVSb3RhdGUxODAoKTogU2hhcGVEZWZpbml0aW9uIHtcclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHtcclxuXHRcdFx0bGF5ZXJzOiB0aGlzLmxheWVycy5tYXAobCA9PiBsLmNsb25lKCkucm90YXRlKDEyKSlcclxuXHRcdH0pO1xyXG5cdH1cclxuXHRjbG9uZUFuZFN0YWNrV2l0aCh1cHBlcjogU3pEZWZpbml0aW9uKTogU2hhcGVEZWZpbml0aW9uIHtcclxuXHRcdGxldCBib3R0b20gPSB0aGlzLmNsb25lKGUgPT4gZS5yZW1vdmVDb3ZlcigpKS5sYXllcnM7XHJcblx0XHRsZXQgdG9wID0gdXBwZXIuY2xvbmUoKS5sYXllcnM7XHJcblx0XHRsZXQgZGggPSAwO1xyXG5cdFx0ZGhsb29wOiBmb3IgKGRoID0gNTsgZGggPiAwOyBkaC0tKSB7XHJcblx0XHRcdGZvciAobGV0IGlCb3R0b20gPSAwOyBpQm90dG9tIDwgYm90dG9tLmxlbmd0aDsgaUJvdHRvbSsrKSB7XHJcblx0XHRcdFx0bGV0IGlUb3AgPSBpQm90dG9tIC0gZGggKyAxO1xyXG5cdFx0XHRcdGxldCBjYW4gPSBib3R0b21baUJvdHRvbV0uY2FuU3RhY2tXaXRoKHRvcFtpVG9wXSk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coe1xyXG5cdFx0XHRcdFx0aUJvdHRvbSxcclxuXHRcdFx0XHRcdGlUb3AsIGNhblxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGlmICghY2FuKVxyXG5cdFx0XHRcdFx0YnJlYWsgZGhsb29wO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRsZXQgb3ZlcmxhcCA9IGJvdHRvbS5sZW5ndGggLSBkaDtcclxuXHRcdGxldCBuZXdMYXllcnMgPSBib3R0b20ubWFwKChsLCBpKSA9PiB7XHJcblx0XHRcdHJldHVybiBsLnN0YWNrV2l0aCh0b3BbaSAtIGRoXSk7XHJcblx0XHR9KS5jb25jYXQodG9wLnNsaWNlKFxyXG5cdFx0XHRvdmVybGFwXHJcblx0XHQpKTtcclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHsgbGF5ZXJzOiBuZXdMYXllcnMuc2xpY2UoMCwgNCkgfSk7XHJcblx0fVxyXG5cclxuXHRjbG9uZUFuZFBhaW50V2l0aChjb2xvcjogY29sb3IpOiBTekRlZmluaXRpb24ge1xyXG5cdFx0bGV0IHJhd1BhaW50cyA9IEFycmF5PGNvbG9yIHwgbnVsbD4oMjQpLmZpbGwoY29sb3IpO1xyXG5cdFx0aWYgKGNvbG9yID09ICdwdXJwbGUnKSBjb2xvciA9ICdwaW5rJztcclxuXHRcdHJldHVybiB0aGlzLmNsb25lKChsLCBpLCBhKSA9PiBsLmNsb25lKCkucGFpbnQoY29sb3IpKTtcclxuXHRcdC8vIHJldHVybiB0aGlzLmNsb25lKChsLCBpLCBhKSA9PiB7XHJcblx0XHQvLyBcdGxldCBwYWludHMgPSBhLnNsaWNlKGkpLnJlZHVjZVJpZ2h0KCh2LCBlKSA9PiBlLmZpbHRlclBhaW50KHYpLCByYXdQYWludHMpO1xyXG5cdFx0Ly8gXHRyZXR1cm4gbC5yZW1vdmVDb3ZlcigpLnBhaW50KHBhaW50cyk7XHJcblx0XHQvLyB9KTtcclxuXHR9XHJcblxyXG5cdGNsb25lQW5kUGFpbnRXaXRoNENvbG9ycyhjb2xvcnM6IFtzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBzdHJpbmddKTogU2hhcGVEZWZpbml0aW9uIHtcclxuXHRcdHRocm93IG5ldyBFcnJvcihcIk1ldGhvZCBub3QgaW1wbGVtZW50ZWQuXCIpO1xyXG5cdH1cclxuXHJcblx0Y2xvbmVBbmRNYWtlQ292ZXIoKSB7XHJcblx0XHRyZXR1cm4gbmV3IFN6RGVmaW5pdGlvbih7IGxheWVyczogdGhpcy5sYXllcnMubWFwKGUgPT4gZS5jbG9uZUFzQ292ZXIoKSkgfSlcclxuXHR9XHJcblxyXG5cclxuXHRjbG9uZShsYXllck1hcHBlcj86IChsYXllcjogU3pMYXllciwgaTogbnVtYmVyLCBhOiBTekxheWVyW10pID0+IFN6TGF5ZXIgfCBTekxheWVyW10gfCBudWxsKSB7XHJcblx0XHRpZiAobGF5ZXJNYXBwZXIpIHtcclxuXHRcdFx0cmV0dXJuIG5ldyBTekRlZmluaXRpb24oe1xyXG5cdFx0XHRcdGxheWVyczogdGhpcy5sYXllcnMubWFwKGUgPT4gZS5jbG9uZSgpKS5mbGF0TWFwKChlLCBpLCBhKSA9PiB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbGF5ZXJNYXBwZXIoZSwgaSwgYSkgfHwgW107XHJcblx0XHRcdFx0fSkuZmlsdGVyKGUgPT4gIWUuaXNFbXB0eSgpKVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHRoaXMsIHRydWUpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGdldFNjaGVtYSgpIHtcclxuXHRcdHJldHVybiB0eXBlcy5zdHJpbmc7XHJcblx0fVxyXG5cdHNlcmlhbGl6ZSgpIHtcclxuXHRcdHJldHVybiB0aGlzLmdldEhhc2goKTtcclxuXHR9XHJcblx0ZGVzZXJpYWxpemUoZGF0YTogYW55LCByb290PzogR2FtZVJvb3QpOiBzdHJpbmcgfCB2b2lkIHtcclxuXHRcdGNvbnNvbGUubG9nKCdkZXNlcicsIHRoaXMpO1xyXG5cdH1cclxuXHJcblxyXG5cclxuXHJcblx0Ly8gaW5oZXJpdGVkXHJcblx0ZHJhd0NlbnRlcmVkKHg6IG51bWJlciwgeTogbnVtYmVyLCBwYXJhbWV0ZXJzOiBEcmF3UGFyYW1ldGVycywgZGlhbWV0ZXI6IG51bWJlcik6IHZvaWQge1xyXG5cdFx0Y29uc3QgZHBpID0gc21vb3RoZW5EcGkoZ2xvYmFsQ29uZmlnLnNoYXBlc1NoYXJwbmVzcyAqIHBhcmFtZXRlcnMuem9vbUxldmVsKTtcclxuXHRcdGlmICghdGhpcy5idWZmZXJHZW5lcmF0b3IpIHtcclxuXHRcdFx0dGhpcy5idWZmZXJHZW5lcmF0b3IgPSB0aGlzLmludGVybmFsR2VuZXJhdGVTaGFwZUJ1ZmZlci5iaW5kKHRoaXMpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3Qga2V5ID0gZGlhbWV0ZXIgKyBcIi9cIiArIGRwaSArIFwiL1wiICsgdGhpcy5jYWNoZWRIYXNoO1xyXG5cdFx0Y29uc3QgY2FudmFzID0gcGFyYW1ldGVycy5yb290LmJ1ZmZlcnMuZ2V0Rm9yS2V5KHtcclxuXHRcdFx0a2V5OiBcInNoYXBlZGVmXCIsXHJcblx0XHRcdHN1YktleToga2V5LFxyXG5cdFx0XHR3OiBkaWFtZXRlcixcclxuXHRcdFx0aDogZGlhbWV0ZXIsXHJcblx0XHRcdGRwaSxcclxuXHRcdFx0cmVkcmF3TWV0aG9kOiB0aGlzLmJ1ZmZlckdlbmVyYXRvcixcclxuXHRcdH0pO1xyXG5cdFx0cGFyYW1ldGVycy5jb250ZXh0LmRyYXdJbWFnZShjYW52YXMsIHggLSBkaWFtZXRlciAvIDIsIHkgLSBkaWFtZXRlciAvIDIsIGRpYW1ldGVyLCBkaWFtZXRlcik7XHJcblx0fVxyXG5cclxuXHJcblx0aW50ZXJuYWxHZW5lcmF0ZVNoYXBlQnVmZmVyKGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQsIGN0eDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJELCB3OiBudW1iZXIsIGg6IG51bWJlciwgZHBpOiBudW1iZXIpOiB2b2lkIHtcclxuXHRcdC8vIHByZXBhcmUgY29udGV4dFxyXG5cdFx0Y3R4LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0Y3R4LmxpbmVKb2luID0gJ3JvdW5kJztcclxuXHRcdGN0eC5saW5lV2lkdGggPSAwLjA1O1xyXG5cclxuXHRcdGN0eC50cmFuc2xhdGUoKHcgKiBkcGkpIC8gMiwgKGggKiBkcGkpIC8gMik7XHJcblx0XHRjdHguc2NhbGUoKGRwaSAqIHcpIC8gMi4zLCAoZHBpICogaCkgLyAyLjMpO1xyXG5cdFx0Y3R4LmxpbmVDYXAgPSAncm91bmQnO1xyXG5cdFx0Y3R4LmxpbmVKb2luID0gJ3JvdW5kJztcclxuXHRcdGN0eC5zdHJva2VTdHlsZSA9IFRIRU1FLml0ZW1zLm91dGxpbmU7XHJcblx0XHRjdHgubGluZVdpZHRoID0gVEhFTUUuaXRlbXMub3V0bGluZVdpZHRoIC8gMTA7XHJcblxyXG5cdFx0Y3R4LnJvdGF0ZSgtTWF0aC5QSSAvIDIpO1xyXG5cclxuXHRcdGN0eC5maWxsU3R5bGUgPSBUSEVNRS5pdGVtcy5jaXJjbGVCYWNrZ3JvdW5kO1xyXG5cdFx0Y3R4LmJlZ2luUGF0aCgpO1xyXG5cdFx0Y3R4LmFyYygwLCAwLCAxLjE1LCAwLCAyICogTWF0aC5QSSk7XHJcblx0XHRjdHguZmlsbCgpO1xyXG5cclxuXHRcdGxldCBzQ3R4ID0gbmV3IFN6Q29udGV4dDJEKGN0eCk7XHJcblx0XHR0aGlzLmxheWVycy5mb3JFYWNoKChsLCBpKSA9PiBsLmRyYXdDZW50ZXJlZExheWVyU2NhbGVkKHNDdHgsIGkpKTtcclxuXHJcblx0fVxyXG5cclxuXHRzdGF0aWMgcmF3SGFzaE1hcDogTWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoKTtcclxuXHRzdGF0aWMgZ2V0SGFzaGZyb21SYXdIYXNoKGhhc2g6IHN0cmluZykge1xyXG5cdFx0aWYgKCF0aGlzLnJhd0hhc2hNYXAuaGFzKGhhc2gpKSB7XHJcblx0XHRcdHRoaXMucmF3SGFzaE1hcC5zZXQoaGFzaCxcclxuXHRcdFx0XHRTekRlZmluaXRpb24uZnJvbVNob3J0S2V5KGhhc2gpLmdldEhhc2goKVxyXG5cdFx0XHQpXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdGhpcy5yYXdIYXNoTWFwLmdldChoYXNoKSE7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZnJvbVJhd1NoYXBlKHNoYXBlRGVmaW5pdGlvbjogU2hhcGVEZWZpbml0aW9uIHwgc3RyaW5nKSB7XHJcblx0XHRpZiAodHlwZW9mIHNoYXBlRGVmaW5pdGlvbiAhPSAnc3RyaW5nJylcclxuXHRcdFx0c2hhcGVEZWZpbml0aW9uID0gc2hhcGVEZWZpbml0aW9uLmdldEhhc2goKTtcclxuXHRcdHJldHVybiBuZXcgU3pEZWZpbml0aW9uKHtcclxuXHRcdFx0bGF5ZXJzOiBzaGFwZURlZmluaXRpb24uc3BsaXQoJzonKS5tYXAoZSA9PiBTekxheWVyLmZyb21TaG9ydEtleShlKSlcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGRlZmluaXRpb25DYWNoZTogTWFwPHN0cmluZywgU3pEZWZpbml0aW9uPiA9IG5ldyBNYXAoKTtcclxuXHRzdGF0aWMgZnJvbVNob3J0S2V5KGtleTogc3RyaW5nKTogU3pEZWZpbml0aW9uIHtcclxuXHRcdGlmICghdGhpcy5kZWZpbml0aW9uQ2FjaGUuaGFzKGtleSkpIHtcclxuXHRcdFx0dGhpcy5kZWZpbml0aW9uQ2FjaGUuc2V0KGtleSwgbmV3IFN6RGVmaW5pdGlvbih7XHJcblx0XHRcdFx0bGF5ZXJzOiBrZXkuc3BsaXQoJzonKS5tYXAoZSA9PiBTekxheWVyLmZyb21TaG9ydEtleShlKSlcclxuXHRcdFx0fSkpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRoaXMuZGVmaW5pdGlvbkNhY2hlLmdldChrZXkpITtcclxuXHR9XHJcblxyXG5cdGNvbXB1dGVfQU5BTFlaRShyb290OiBHYW1lUm9vdCk6IFtCYXNlSXRlbSB8IG51bGwsIEJhc2VJdGVtIHwgbnVsbF0ge1xyXG5cdFx0bGV0IGZpcnN0UXVhZCA9IHRoaXMubGF5ZXJzWzBdLnF1YWRzWzBdO1xyXG5cdFx0aWYgKGZpcnN0UXVhZC5mcm9tICE9IDApIHJldHVybiBbbnVsbCwgbnVsbF07XHJcblx0XHRsZXQgZGVmaW5pdGlvbiA9IG5ldyBTekRlZmluaXRpb24oeyBsYXllcnM6IFtTekluZm8ucXVhZC5leGFtcGxlTGF5ZXIoZmlyc3RRdWFkLnNoYXBlKV0gfSk7XHJcblx0XHQvLyBAdHMtZXhwZWN0LWVycm9yXHJcblx0XHRsZXQgY29sb3IgPSBlbnVtU2hvcnRjb2RlVG9Db2xvcltTekluZm8uY29sb3IuYnlOYW1lW2ZpcnN0UXVhZC5jb2xvcl0uY29kZV07XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHRDT0xPUl9JVEVNX1NJTkdMRVRPTlNbY29sb3JdLFxyXG5cdFx0XHRyb290LnNoYXBlRGVmaW5pdGlvbk1nci5nZXRTaGFwZUl0ZW1Gcm9tRGVmaW5pdGlvbihkZWZpbml0aW9uKSxcclxuXHRcdF07XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgaW5zdGFsbChtb2Q6IE1vZCkge1xyXG5cdFx0bW9kLm1vZEludGVyZmFjZS5leHRlbmRPYmplY3QoU2hhcGVEZWZpbml0aW9uLCAoeyAkb2xkIH0pID0+ICh7XHJcblx0XHRcdGZyb21TaG9ydEtleShrZXk6IHN0cmluZykge1xyXG5cdFx0XHRcdHJldHVybiBTekRlZmluaXRpb24uZnJvbVNob3J0S2V5KGtleSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdGlzVmFsaWRTaG9ydEtleShrZXk6IHN0cmluZykge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRTekRlZmluaXRpb24uZnJvbVNob3J0S2V5KGtleSk7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KSk7XHJcblxyXG5cdFx0bW9kLm1vZEludGVyZmFjZS5leHRlbmRDbGFzcyhMb2dpY0dhdGVTeXN0ZW0sICh7ICRvbGQgfSkgPT4gKHtcclxuXHRcdFx0Y29tcHV0ZV9BTkFMWVpFKHBhcmFtZXRlcnMpIHtcclxuXHRcdFx0XHRsZXQgaXRlbSA9IHBhcmFtZXRlcnNbMF07XHJcblx0XHRcdFx0aWYgKCFpdGVtIHx8IGl0ZW0uZ2V0SXRlbVR5cGUoKSAhPT0gXCJzaGFwZVwiKSB7XHJcblx0XHRcdFx0XHQvLyBOb3QgYSBzaGFwZVxyXG5cdFx0XHRcdFx0cmV0dXJuIFtudWxsIGFzIGFueSBhcyBCYXNlSXRlbSwgbnVsbCBhcyBhbnkgYXMgQmFzZUl0ZW1dO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRsZXQgZGVmID0gKGl0ZW0gYXMgU2hhcGVJdGVtKS5kZWZpbml0aW9uO1xyXG5cdFx0XHRcdGlmIChkZWYgaW5zdGFuY2VvZiBTekRlZmluaXRpb24pIHtcclxuXHRcdFx0XHRcdHJldHVybiBkZWYuY29tcHV0ZV9BTkFMWVpFKHRoaXMucm9vdCEpIGFzIGFueTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmV0dXJuICRvbGQuY29tcHV0ZV9BTkFMWVpFLmNhbGwodGhpcywgcGFyYW1ldGVycyk7XHJcblx0XHRcdH1cclxuXHRcdH0pKVxyXG5cclxuXHR9XHJcbn1cclxuXHJcbiJdfQ==