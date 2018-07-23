#if defined( HAS_ENVTEXTURE ) || defined( PHYSICAL )

	uniform float u_reflectivity;
	uniform float u_envTextureIntensity;

#endif

#ifdef HAS_ENVTEXTURE

    #ifdef ENVTEXTURE_CUBE

        uniform samplerCube u_envTexture;

    #else

        uniform sampler2D u_envTexture;

    #endif

    uniform int u_maxMipLevel;
    uniform float u_refractionRatio;

#endif
