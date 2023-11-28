"use strict";

/**
 * @class CanvasToolClass - Class to manage the pixel to draw into canvas in Context.ImageData (Canvas API).
 *
 * @author <albonteddy@gmail.com>
 * @version 1.0.1
 * @copyright July 17 2023
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
 *
 * @license MIT
 */

class CanvasToolClass {
    /**
     * @constructor Step 1. Create CanvasToolClass.</b>.
     *
     * @param {string} canvasId the HTML ID use to declare canvas. The 'sinwave' in following canvas snippet. <code>'<canvas class="sinewave" id="sinwave" width="1056" height="160"></canvas>'</code>.
     * @param {number} width  number @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/width
     * @param {number} height number @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/height
     * @param {number} border number - The size of border, 0 to 10% of the height.
     */
    constructor(canvasId, width, height, border) {
        /** @private */
        this.canvasId = canvasId;
        /** @private */
        this.width = width;
        /** @private */
        this.height = height;
        /** @private */
        this.border = border;
        /** @private */
        this.isBusy = false;
        /** @private */
        this.dataFrame = null;
        /** @private */
        this.sizeFrame = 0;
        /** @private */
        this.dataContext = null;
        /** @private */
        this.logAllErrors = true;
    }

    getWidth() {
        return this.width;
    }
    getHeight() {
        return this.height;
    }

    /**
     * Helper method to add double quote on type string.
     *
     * @param {string} param 
     * @returns {string}
     */
    static quotedAsString(param) {
        let fn = param;
        if (fn !== null) {
            if (fn.length < 1) {
                fn = null;
            } else if (fn.charAt(0) !== '"') {
                fn = '"' + fn + '"';
            }
        }
        return fn;
    }

    toString() {
        let datus = {
            canvasId: this.canvasId,
            width: this.width,
            height: this.height,
            border: this.border,
            isBusy: this.isBusy,
            dataFrame: null !== this.dataFrame,
            sizeFrame: this.sizeFrame,
            dataContext: null !== this.dataContext,
            logAllErrors: this.logAllErrors,
            nFields: 9
        };
        return JSON.stringify(datus);
    }

    /**
     * Enable or Disable logging of message during exception.
     * @param {boolean} isSet 
     */
    setLogging(isSet) {
        this.logAllErrors = isSet;
    }

    /**
     * Generate an Error string. optionally log the generated Error string.
     *
     * @param {string} signature - Name of method generating the error message.
     * @param {boolean} isLog - boolean if true write message to console.error().
     * @param {string} theError - the actual error.
     * @return {string}
     */
    static generateCommonError(signature, isLog, theError) {
        let msg = `ERROR: CanvasToolClass.${signature} - ${theError}`;
        if (isLog) console.error(msg);
        return msg;
    }

    /**
     * Generate error, log it and return it.
     *
     * @param {string} signature 
     * @param {string} theError - the actual error.
     * @return {string}
     */
    generateErrorMessage(signature, theError) {
        return CanvasToolClass.generateCommonError(signature, this.logAllErrors, theError);
    }

    /**
     * @method Create a BoxDataStructure.
     *
     * @param {Object} _data - The Int16Array representation of an AudioBuffer.
     * @param {integer} _size - The sizeof of Int16Array.
     * @param {integer} _canvasWidth - The width suitable for CanvasToolClass processing.
     * @returns {Object} {BoxDataStructure}
     */
    static createBoxDataStructure(_data, _size, _canvasWidth) {
        /**
         * Once created, only offset, iStart, iEnd, nextOffset is modifiable.
         */
        let boxData = {
            _name: "BoxDataStructure",
            data: _data,
            size: _size,
            threshold: _size - 1,
            block: _canvasWidth,
            offset: 0,
            iStart: 0,
            iEnd: 0,
            nextOffset: 0
        };
        return new Object(boxData);
    }

    /**
     * @method Adjust the offset, iStart, iEnd, nextOffset properties on the BoxDataStructure.
     *
     * @param {Object} _boxDataStructure - {BoxDataStructure} created by {@method createBoxDataStructure}
     * @param {integer} iStart - capture Audio starting a this offset.
     * @param {integer} iEnd  - capture Audio until this value is reach, and if it is, the next Audio will came from &data[0...]
     * @param {integer} nextOffset - Use 0 if iStart is controlling the selection
     * @returns {Object} [boolean, {BoxDataStructure}, [], integer]
     * @throws {Error} if given {Object} is not a valid {BoxDataStructure}
     */
    static extractDataForBoxDataStructure(_boxDataStructure, iStart, iEnd, nextOffset) {
        let signature = 'extractDataForBoxDataStructure';

        var boxData;
        try {
            boxData = Object.assign({}, _boxDataStructure);
        } catch (e) {
            throw generateCommonError(signature, true, "_boxDataStructure is Not a valid BoxDataStructure");
        }

        if (typeof boxData['_name'] === 'undefined' ||
            boxData['_name'] !== 'BoxDataStructure'
        ) {
            throw generateCommonError(signature, true, "Invalid structure, missing BoxDataStructure.name");
        }

        var position, n_bits = 0;
        var bits = [];

        var offset = iStart + nextOffset;

        var limit, blocks = boxData.block;

        var threshold = boxData.threshold;

        if (iEnd < threshold) threshold = iEnd;

        boxData.offset = offset;
        boxData.iStart = iStart;
        boxData.iEnd = iEnd;
        boxData.nexOffset = nextOffset;

        if (threshold > iStart) {
            for (limit = offset + blocks;
                (n_bits < blocks) && (offset < limit); offset++, n_bits++) {

                if (offset >= threshold) {
                    position = offset % boxData.size;
                    bits.push(boxData.data[position]);

                } else {
                    bits.push(boxData.data[offset]);
                }
            }
        }

        let okay = n_bits > 0;
        return [okay, boxData, bits, n_bits];
    }

    /**
     * @method Step 2. Create Context.ImageData
     *
     * @param {Object} _document The HTML document object.
     * @returns {boolean} always true
     * @throws Error - It log the error message if {logAllErrors} is true.
     */
    drawBegin(_document) {
        // 2.1. set signature
        let signature = 'drawBegin';

        // 2.2. make sure previously created Canvas Context is properly closed.
        if (this.dataFrame !== null) {
            throw generateErrorMessage(signature, `Previously created canvas="${this.canvasId}" data still exist. Call drawEnd(false) to disposed it.`);
        }

        // 2.3. In multi-threaded environment, avoid data corruption; So ensure only a single instance of drawBegin is running.
        if (this.setBusy(true) === true) {
            throw generateErrorMessage(signature, `canvas="${this.canvasId}" is still in progress.`);
        }
        // 2.4. Each time to use the canvas, need to do the following steps.

        // 2.4.1 is canvas ID valid?
        const canvas = _document.getElementById(this.canvasId);

        // 2.4.2 is canvas 2d available for this element?
        const ctx = canvas.getContext('2d', {
            willReadFrequently: true
        });
        if (typeof ctx === 'undefined') {
            // 2.4.3 possibly not a canvas element
            this.isBusy = false;
            throw generateErrorMessage(signature, `canvas="${this.canvasId}" ID does not exist.`);
        }

        // 2.4.4 grab a Context.ImageData
        let frame, err;
        try {
            frame = ctx.getImageData(this.border, this.border, this.width, this.height);
        } catch (e) {
            // 2.4.5 this error, in some circumstances happen. So we report it here.
            this.isBusy = false;
            err = JSON.stringify(e);
            throw generateErrorMessage(signature, `Context.ImageData error for canvas="${this.canvasId}", "${err}"`);
        }

        // 2.5 save the Context.ImageData and its size.
        this.dataFrame = frame;
        this.sizeFrame = frame.data.length;
        this.dataContext = ctx;
        this.isBusy = false;
        return true;
    }

    /**
     * @method Step 3. Clear the canvas background with black or green color.
     *
     * @param {boolean} isGreen 
     * @returns {boolean} always true
     * @throws Error - It log the error message if {logAllErrors} is true.
     */
    drawClearBackground(isGreen) {
        // 3.1. set signature
        let signature = 'drawClearBackground';

        // 3.2. make sure previously created Canvas Context is properly created.
        if (this.dataFrame === null) {
            throw generateErrorMessage(signature, `Context.ImageData for canvas="${this.canvasId}" does not exist. Call drawBegin(document) to create one.`);
        }

        // 3.3. In multi-threaded environment, avoid data corruption; So ensure only a single instance of drawClearBackground is running.
        if (this.setBusy(true) === true) {
            throw generateErrorMessage(signature, `canvas="${this.canvasId}" is still in progress.`);
        }

        // 3.4. clear the background as black or as green.
        let rr = 0,
            gg = 0,
            bb = 0;
        if (isGreen) {
            rr = 12;
            gg = 110;
            bb = 38; // Dark Green
        }

        // 3.5 clear it now
        let arr = this.dataFrame.data;
        let i, w_h_size = this.sizeFrame - 4;
        for (i = 0; i <= w_h_size; i += 4) {
            arr[i + 0] = rr; // R value
            arr[i + 1] = gg; // G value
            arr[i + 2] = bb; // B value
            arr[i + 3] = 255; // A value
        }

        // 3.6 done clearing
        this.isBusy = false;
        return true;
    }

    /**
     * @method Step 4. Draw the content of given Array of Integer into the Canvas.
     *
     * @param {integer} n_bits - Total number of integer in bits. The number 0 to (n_bits - 1) is map to X coordinate parts of the Canvas.
     * @param {Object} bits  - Array of integer -256 to +256 in range. The content of bits[0...1023] is map to Y coordinate parts of the Canvas.
     * The expected values of bits[...] in the range -N to +N where N is equal where expected to be half of Canvas.height.
     * @param {boolean} isBar - Draw bits like a bar chart. Each bar is drawn as 2 pixel, and next pixel at 4th postion. Hence it can only
     * draw width / 4. In 1024 width, only 256 bar are visible. 
     * @param {integer} rr -   RED part of pixel color to be drawn.
     * @param {integer} gg - GREEN part of pixel color to be drawn.
     * @param {integer} bb -  BLUE part of pixel color to be drawn.
     *
     * @returns {boolean} false if n_bits < 1 or bits is null, otherwise an Error or true.
     */
    drawOnCanvas(n_bits, bits, isBar, rr, gg, bb) {
        // 4.0 It can draw at least 1 pixel.
        if (n_bits < 1 || bits === null) {
            // No Error for this???
            return false;
        }

        // 4.1. set signature
        let signature = 'drawOnCanvas';

        // 4.2. make sure previously created Canvas Context is properly created.
        if (this.dataFrame === null) {
            throw generateErrorMessage(signature, `Context.ImageData for canvas="${this.canvasId}" does not exist. Call drawBegin(document) to create one.`);
        }

        // 4.3. In multi-threaded environment, avoid data corruption; So ensure only a single instance of drawOnCanvas is running.
        if (this.setBusy(true) === true) {
            throw generateErrorMessage(signature, `canvas="${this.canvasId}" is still in progress.`);
        }

        // 4.4. Get Canvas Context.ImageData data
        let arr = this.dataFrame.data;
        let w_h_size = this.sizeFrame - 4;

        // 4.5 Draw the data bits (It could be the "sine wave" or .wav or .mp3 bits)
        let x, xx, y, yy, x_offset, y_offset;

        // 4.6 setup contraint for Y values, clip it if out of range.
        let center_y = this.height / 2;
        let clip_neg_y = 1 - this.height; // -255
        let clip_pos_y = this.height - 1; // +255
        let n_bars = this.width / 4;

        let width_4 = 4 * this.width; // adjust X as each pixel is 4 byte long
        let dx;
        if (isBar) {
            center_y = this.height;
            w_h_size -= 4; // less 8
            for (x = 0, xx = 0;
                (x < n_bits) && (x < n_bars) && (xx < this.width); x++, xx += 8) {
                // 4.7 Clip it -255 to +255
                y = bits[x];
                if (y < clip_neg_y) {
                    y = clip_neg_y;
                } else if (y > clip_pos_y) {
                    y = clip_pos_y;
                }
                dx = 4 * xx;
                for (yy = 0; yy < y; yy++) {

                    // 4.8 Move it to center at Y-axis position E.g. drawn to Y=321 to 831
                    y_offset = (center_y - yy) * width_4;

                    x_offset = y_offset + dx;
                    // 4.9 Clip in Context.ImageData range. Always draw 2 pixel in a row.
                    if (x_offset >= 0 && x_offset <= w_h_size) {
                        arr[x_offset + 0] = rr; // R value
                        arr[x_offset + 1] = gg; // G value
                        arr[x_offset + 2] = bb; // B value
                        arr[x_offset + 3] = 255; // A value  
                        arr[x_offset + 4] = rr; // R value
                        arr[x_offset + 5] = gg; // G value
                        arr[x_offset + 6] = bb; // B value
                        arr[x_offset + 7] = 255; // A value  
                    }
                }
            }
        } else {
            for (x = 0;
                (x < n_bits) && (x < this.width); x++) {
                // 4.10 Clip it -255 to +255
                y = bits[x];
                if (y < clip_neg_y) {
                    y = clip_neg_y;
                } else if (y > clip_pos_y) {
                    y = clip_pos_y;
                }
                dx = 4 * x;
                // 4.11 Move it to center at Y-axis position E.g. drawn to Y=321 to 831
                y += center_y;
                if (y < 0) y = 0;
                y_offset = y * width_4;
                x_offset = y_offset + dx;
                // 4.12 Clip in Context.ImageData range.
                if (x_offset >= 0 && x_offset <= w_h_size) {
                    arr[x_offset + 0] = rr; // R value
                    arr[x_offset + 1] = gg; // G value
                    arr[x_offset + 2] = bb; // B value
                    arr[x_offset + 3] = 255; // A value  
                }
            }
        }
        // 4.13 done drawing on Canvas (steps 7-9, 10-12)
        this.isBusy = false;
        return true;
    }

    /**
     * @method Step 5. Draw the marker on the given X position using the provide colors.
     *
     * @param {integer} x_coor - The marker coordinate 0 to width - 1.
     * @param {integer} rr -   RED part of pixel color to be drawn.
     * @param {integer} gg - GREEN part of pixel color to be drawn.
     * @param {integer} bb -  BLUE part of pixel color to be drawn.
     *
     * @returns {boolean} false if n_bits < 1 or bits is null, otherwise an Error or true.
     */
    drawCanvasMarker(x_coor, rr, gg, bb) {
        // 5.0. set signature
        let signature = 'drawCanvasMarker';

        if (x_coor < 0) {
            return false;
        }

        // 5.1. make sure previously created Canvas Context is properly created.
        if (this.dataContext === null) {
            throw generateErrorMessage(signature, `Context.ImageData for canvas="${this.canvasId}" does not exist. Call drawBegin(document) to create one.`);
        }

        // 5.2. In multi-threaded environment, avoid data corruption; So ensure only a single instance of drawEnd is running.
        if (this.setBusy(true) === true) {
            throw generateErrorMessage(signature, `canvas="${this.canvasId}" is still in progress.`);
        }

        // 5.3 Draw at this X position
        let x = x_coor % this.width;

        // 5.4. Get Canvas Context.ImageData data
        let arr = this.dataFrame.data;
        let w_h_size = this.sizeFrame - 8;

        // 5.5 Draw the data bits (It could be the "sine wave" or .wav or .mp3 bits)
        let y, yy, x_offset, y_offset;

        // 5.6 setup contraint for Y values, clip it if out of range.
        let center_y = this.height / 2;
        let clip_neg_y = 1 - this.height; // -255
        let clip_pos_y = this.height - 1; // +255

        // 5.7 the Y as maximum amplitude in -255 to +255 range
        let dx = x * 4;
        let width_4 = 4 * this.width; // adjust X as each pixel is 4 byte long

        // 5.8 Move it to center at Y-axis position E.g. drawn to Y=127 to 383
        for (yy = clip_neg_y; yy < clip_pos_y; yy++) {
            y = yy + center_y;
            y_offset = y * width_4;
            x_offset = y_offset + dx;
            // 5.9 Clip in Context.ImageData range. Always draw 2 pixel in a row.
            if (x_offset >= 0 && x_offset <= w_h_size) {
                arr[x_offset + 0] = rr; // R value
                arr[x_offset + 1] = gg; // G value
                arr[x_offset + 2] = bb; // B value
                arr[x_offset + 3] = 255; // A value  
                arr[x_offset + 4] = rr; // R value
                arr[x_offset + 5] = gg; // G value
                arr[x_offset + 6] = bb; // B value
                arr[x_offset + 7] = 255; // A value  
            }
        }
        // 5.10 done drawing Marker on Canvas
        this.isBusy = false;
        return true;
    }

    /**
     * @method Step 6. Commit the drawing to Canvas Context via Context.putImageData().
     *
     * @throws Error if (@private {dataContext}) was already drawn.
     *
     * @returns true, otherwise Error
     */
    drawEnd() {
        // 6.1. set signature
        let signature = 'drawEnd';

        // 6.2. make sure previously created Canvas Context is properly created.
        if (this.dataContext === null) {
            throw generateErrorMessage(signature, `Context.ImageData for canvas="${this.canvasId}" does not exist. Call drawBegin(document) to create one.`);
        }

        // 6.3. In multi-threaded environment, avoid data corruption; So ensure only a single instance of drawEnd is running.
        if (this.setBusy(true) === true) {
            throw generateErrorMessage(signature, `canvas="${this.canvasId}" is still in progress.`);
        }

        // 6.4 Draw it into the Canvas
        this.dataContext.putImageData(this.dataFrame, this.border, this.border);

        // 6.5 Clear these var to signifiy drawing into the Canvas is completed.
        this.dataFrame = null;
        this.dataContext = null;
        this.sizeFrame = 0;
        this.isBusy = false;
        return true;
    }

    /**
     * @method Mark busy flag.
     * This is the only way the method here will have access to the resource within the class.
     *
     * @param {boolean} flag boolean Busy flag to set.
     * @returns boolean Previous Busy flag
     */
    setBusy(flag) {
        let before = this.isBusy;
        this.isBusy = flag;
        return before;
    }

}