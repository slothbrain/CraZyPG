import { isTypedArray } from '../core/typedArray';

const texturesMap = new WeakMap();
const WebGLSamplerCtor = window.WebGLSampler || function NoWebGLSampler() {};
const ctx = document.createElementNS( 'http://www.w3.org/1999/xhtml', 'canvas' ).getContext( '2d' );

const lastPackState = {};
function savePackState( gl, options ) {

    if ( options.unpackAlignment !== undefined ) {

        lastPackState.unpackAlignment = gl.getParameter( gl.UNPACK_ALIGNMENT );
        gl.pixelStorei( gl.UNPACK_ALIGNMENT, options.unpackAlignment );

    }
    if ( options.colorspaceConversion !== undefined ) {

        lastPackState.colorspaceConversion = gl.getParameter( gl.UNPACK_COLORSPACE_CONVERSION_WEBGL );
        gl.pixelStorei( gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, options.colorspaceConversion );

    }
    if ( options.premultiplyAlpha !== undefined ) {

        lastPackState.premultiplyAlpha = gl.getParameter( gl.UNPACH_PREMULTIPLY_ALPHA_WEBGL );
        gl.pixelStorei( gl.UNPACH_PREMULTIPLY_ALPHA_WEBGL, options.premultiplyAlpha );

    }
    if ( options.flipY !== undefined ) {

        lastPackState.flipY = gl.getParameter( gl.UNPACK_FLIP_Y_WEBGL );
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, options.flipY );

    }

}

function restorePackState( gl, options ) {

    if ( options.unpackAlignment !== undefined )
        gl.pixelStorei( gl.UNPACK_ALIGNMENT, lastPackState.unpackAlignment );
    if ( options.colorspaceConversion !== undefined )
        gl.pixelStorei( gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, lastPackState.colorspaceConversion );
    if ( options.premultiplyAlpha !== undefined )
        gl.pixelStorei( gl.UNPACH_PREMULTIPLY_ALPHA_WEBGL, lastPackState.premultiplyAlpha );
    if ( options.flipY !== undefined )
        gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, lastPackState.flipY );

}

function getCubeFacesOrder( gl, options ) {

    const opts = options || {};
    return opts.cubeFaceOrder || [
        gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    ];

}

function getCubeFacesWithIdx( gl, options ) {

    const faces = getCubeFacesOrder( gl, options );

    const facesWithIdx = faces.map( ( face, idx ) => ( { face, idx } ) );

    facesWithIdx.sort( ( a, b ) => ( a.face - b.face ) );

    return facesWithIdx;

}

// OnePixelTexture { target, color[array [255 / 1]] }
function setTextureTo1PixelColor( gl, texture ) {

    const { target, color } = texture;
    const onePixelColor = isTypedArray( color ) ? color : new Uint8Array( [ color[ 0 ], color[ 1 ], color[ 2 ], color[ 3 ] ] );

    if ( target === gl.TEXTURE_CUBE_MAP )
        for ( let i = 0; i < 6; i ++ )
            gl.texImage2D( gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, onePixelColor );
    else if ( target === gl.TEXTURE_3D || target === gl.TEXTURE_2D_ARRAY )
        gl.texImage3D( target, 0, gl.RGBA, 1, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, onePixelColor );
    else
        gl.texImage2D( target, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, onePixelColor );

}

// ArrayTexture {[ unpackAlignment=1, colorspaceConversion, premultiplyAlpha, flipY ]}
// Texture2D { src, traget, width, height, level, internalFormat, format, type }
// TextureCubeMap { ...Texture2D, faceSize, cubeFaceOrder }
// Texture3D { ...Texture2D, depth }
function setTextureFromArray( gl, texture ) {

    const {
        src, target, width, height, depth, level, internalFormat, format, type,
        faceSize,
    } = texture;

    savePackState( gl, texture );

    if ( target === gl.TEXTURE_CUBE_MAP )
        getCubeFacesWithIdx( gl, texture ).forEach( ( f ) => {

            const offset = faceSize * f.idx;
            const data = src.subarray( offset, offset + faceSize );
            gl.texImage2D( f.face, level, internalFormat, width, height, 0, format, type, data );

        } );
    else if ( target === gl.TEXTURE_3D )
        gl.texImage3D( target, level, internalFormat, width, height, depth, 0, format, type, src );
    else
        gl.texImage2D( target, level, internalFormat, width, height, 0, format, type, src );

    restorePackState( gl, texture );

}

// ElementTexture { [ unpackAlignment=1, colorspaceConversion, premultiplyAlpha, flipY ] }
// Texture2D { src, target, level, internalFormat, format, type }
// TextureCubeMap { ...Texture2D, size, slices }
// Texture3D { ... Texture2D, size, depth, xMult, yMult }
function setTextureFromElement( gl, texture ) {

    const {
        src, target, level, internalFormat, format, type,
        size, slices,
        depth, xMult, yMult,
    } = texture;

    savePackState( gl, texture );

    if ( target === gl.TEXTURE_CUBE_MAP ) {

        ctx.canvas.width = size;
        ctx.canvas.height = size;

        getCubeFacesWithIdx( gl, texture ).forEach( ( f ) => {

            const xOffset = slices[ ( f.idx * 2 ) + 0 ] * size;
            const yOffset = slices[ ( f.idx * 2 ) + 1 ] * size;
            ctx.drawImage( src, xOffset, yOffset, size, size, 0, 0, size, size );
            gl.texImage2D( f.face, level, internalFormat, format, type, ctx.canvas );

        } );

        ctx.canvas.width = 1;
        ctx.canvas.height = 1;

    } else if ( target === gl.TEXTURE_3D ) {

        gl.texImage3D( target, level, internalFormat, size, size, size, 0, format, type, null );
        ctx.canvas.width = size;
        ctx.canvas.height = size;
        for ( let d = 0; d < depth; d ++ ) {

            const srcX = d * size * xMult;
            const srcY = d * size * yMult;
            const srcW = size;
            const srcH = size;
            const dstX = 0;
            const dstY = 0;
            const dstW = size;
            const dstH = size;
            ctx.drawImage( src, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH );
            gl.texSubImage3D( target, level, 0, 0, d, size, size, 1, format, type, ctx.canvas );

        }

        ctx.canvas.width = 1;
        ctx.canvas.height = 1;

    } else
        gl.texImage2D( target, level, internalFormat, format, type, src );

}

// EmptyTexture { [ unpackAlignment=1, colorspaceConversion, premultiplyAlpha, flipY ] }
// Texture2D { src, target, level, internalFormat, format, type, width, height }
// TextureCubeMap { ...Texture2D }
// Texture3D { ... Texture2D, depth }
function setEmptyTexture( gl, texture ) {

    const {
        target, level, internalFormat, format, type, width, height,
        depth,
    } = texture;

    savePackState( gl, texture );

    if ( target === gl.TEXTURE_CUBE_MAP )
        for ( let i = 0; i < 6; i ++ )
            gl.texImage2D( gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, internalFormat, width, height, 0, format, type, null );
    else if ( target === gl.TEXTURE_3D )
        gl.texImage3D( target, level, internalFormat, width, height, depth, 0, format, type, null );
    else
        gl.texImage2D( target, level, internalFormat, width, height, 0, format, type, null );

    restorePackState( gl, texture );

}

// TextureCubeMap { src: [[]], internalFormat, format, type, updateInfo, }
function setCubeMapFromElements( gl, texture ) {

    const {
        src, internalFormat, format, type, updateInfo,
    } = texture;

    const faces = getCubeFacesOrder( gl, texture );
    savePackState( gl, texture );

    for ( let level = 0; level < src.length; level ++ )
        for ( let face = 0; face < 6; face ++ )
            if ( updateInfo[ level ][ face ] )
                gl.texImage2D( faces[ face ], level, internalFormat, format, type, src[ level ][ face ] );

    restorePackState( gl, texture );

}

// Texture3D { src, target, internalFormat, format, type, [firstImage], updateInfo }
function setTexture3DFromElements( gl, texture ) {

    const {
        src, internalFormat, format, type,
        target, firstImage, updateInfo,
    } = texture;

    const { width, height } = src[ 0 ][ 0 ];
    const depth = src[ 0 ].length;

    savePackState( gl, texture );

    if ( ! firstImage ) {

        texture.firstImage = {}; // eslint-disable-line
        gl.texImage3D( target, 0, internalFormat, width, height, depth, 0, format, type, null );

    }

    for ( let level = 0; level < src.length; level ++ )
        for ( let dep = 0; dep < depth; dep ++ )
            if ( updateInfo[ level ][ dep ] ) {

                const img = src[ level ][ dep ];
                gl.texSubImage3D( target, level, 0, 0, dep, img.width, img.height, 1, format, type, img );

            }

    restorePackState( gl, texture );

}

function setTextureFiltering( gl, texture ) {

    const { target, canGenerateMipmap, canFilter } = texture;

    if ( canGenerateMipmap )
        gl.generateMipmap( target );
    else {

        const filtering = canFilter ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, filtering );
        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, filtering );
        gl.texParameteri( target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
        gl.texParameteri( target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );

    }

}

function setTextureSamplers( gl, options ) {

    const { target } = options;

    if ( options.minMag ) {

        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, options.minMag );
        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, options.minMag );

    }

    if ( options.min )
        gl.texParameteri( target, gl.TEXTURE_MIN_FILTER, options.min );

    if ( options.mag )
        gl.texParameteri( target, gl.TEXTURE_MAG_FILTER, options.mag );

    if ( options.wrap ) {

        gl.texParameteri( target, gl.TEXTURE_WRAP_S, options.wrap );
        gl.texParameteri( target, gl.TEXTURE_WRAP_T, options.wrap );
        if ( target === gl.TEXTURE_3D || target instanceof WebGLSamplerCtor )
            gl.texParameteri( target, gl.TEXTURE_WRAP_R, options.wrap );

    }

    if ( options.wrapR )
        gl.texParameteri( target, gl.TEXTURE_WRAP_R, options.wrapR );

    if ( options.wrapS )
        gl.texParameteri( target, gl.TEXTURE_WRAP_S, options.wrapS );

    if ( options.wrapT )
        gl.texParameteri( target, gl.TEXTURE_WRAP_T, options.wrapT );

    if ( options.minLod )
        gl.texParameteri( target, gl.TEXTURE_MIN_LOD, options.minLod );

    if ( options.maxLod )
        gl.texParameteri( target, gl.TEXTURE_MAX_LOD, options.maxLod );

    if ( options.baseLevel )
        gl.texParameteri( target, gl.TEXTURE_BASE_LEVEL, options.baseLevel );

    if ( options.maxLevel )
        gl.texParameteri( target, gl.TEXTURE_MAX_LEVEL, options.maxLevel );

}

// Texture2D { target, width, height, level, internalFormat, format, type }
// TextureCubemap { ...Texture2D }
// Texture3D { ...Texture2D, depth }
function resizeTexture( gl, texture, gltex ) {

    const {
        target, width, height, depth, level, internalFormat, format, type,
    } = texture;

    gl.bindTexture( target, gltex );

    if ( target === gl.TEXTURE_CUBE_MAP )
        for ( let i = 0; i < 6; i ++ )
            gl.texImage2D( gl.TEXTURE_CUBE_MAP_NEGATIVE_X + i, level, internalFormat, width, height, 0, format, type, null );
    else if ( target === gl.TEXTURE_3D )
        gl.texImage3D( target, 0, internalFormat, width, height, depth, 0, format, type, null );
    else
        gl.texImage2D( target, level, internalFormat, width, height, 0, format, type, null );

}

// Texture { autoFiltering, canGenerateMipmap, canFilter, isPending
// [ minMag, min=gl.NEAREST_MIPMAP_LINEAR, mag=gl.LINEAR, wrap, wrapR, wrapS, wrapT, minLod, maxLod, baseLevel, maxLevel ]
// }
function setTexture( gl, texture, gltex = gl.createTexture() ) {

    const {
        src, target, autoFiltering, isPending,
    } = texture;

    gl.bindTexture( target, gltex );
    if ( isPending )
        setTextureTo1PixelColor( gl, texture );
    else if ( src )
        if ( isTypedArray( src ) )
            setTextureFromArray( gl, texture );
        else if ( src instanceof HTMLElement )
            setTextureFromElement( gl, texture );
        else if ( Array.isArray( src ) && src[ 0 ][ 0 ] instanceof HTMLElement ) {

            if ( target === gl.TEXTURE_CUBE_MAP )
                setCubeMapFromElements( gl, texture );
            else
                setTexture3DFromElements( gl, texture );

        } else
            throw new Error( 'unsupported src type' );
    else
        setEmptyTexture( gl, texture );

    if ( autoFiltering )
        setTextureFiltering( gl, texture );

    setTextureSamplers( gl, texture );

    return gltex;

}

function Textures( gl ) {

    this._gl = gl;

}

Object.assign( Textures.prototype, {

    get( texture ) {

        return texturesMap.get( texture );

    },

    remove( texture ) {

        if ( texturesMap.has( texture ) ) {

            const value = texturesMap.get( texture );

            this._gl.deleteTexture( value.texture );
            texturesMap.delete( texture );

        }

    },

    // { needUpdate }
    update( texture ) {

        const value = texturesMap.get( texture );

        if ( value === undefined )
            texturesMap.set( texture, setTexture( this._gl, texture ) );
        else if ( texture.needUpdate ) {

            setTexture( this._gl, texture, value );
            texture.needUpdate = false; // eslint-disable-line

        } else if ( texture.needResize ) {

            resizeTexture( this._gl, texture, value );
            texture.needResize = false; // eslint-disable-line

        }

        return this;

    },

} );

export { Textures };