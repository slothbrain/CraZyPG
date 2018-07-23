#include <common>
#include <common_vs>
#include <uv_spec_vs>
#include <uv2_spec_vs>
#include <normal_spec_vs>
#include <color_spec_vs>
#include <displacement_texture_spec_vs>
// shadow
// clip planes

#include <fog_spec_vs>
#include <worldpos_spec_vs>
#include <logdepth_spec_vs>

void main() {

    #include <begin_position_vs>
    #include <begin_normal_vs>

    #include <morph_vs>
    #include <skinning_vs>
    #include <displacement_texture_vs>
    #include <uv_vs>
    #include <uv2_vs>
    #include <normal_vs>
    #include <color_vs>
    #include <position_vs>

    #include <fog_vs>
    #include <worldpos_vs>
    #include <logdepth_vs>

}