"""Rectangular calibration block with four through-holes (benchmark 01)."""

from build123d import (
    Axis,
    BuildPart,
    BuildSketch,
    Circle,
    Locations,
    Mode,
    Plane,
    Rectangle,
    chamfer,
    extrude,
)

LENGTH_X = 100.0
WIDTH_Y = 60.0
HEIGHT_Z = 20.0
HOLE_DIAMETER = 8.0
HOLE_OFFSET_X = 35.0
HOLE_OFFSET_Y = 20.0
TOP_CHAMFER = 2.0


def gen_step():
    with BuildPart() as block:
        with BuildSketch(Plane.XY):
            Rectangle(LENGTH_X, WIDTH_Y)
        extrude(amount=HEIGHT_Z)

        top_face = block.faces().sort_by(Axis.Z)[-1]
        chamfer(top_face.edges(), length=TOP_CHAMFER)

        with BuildSketch(Plane.XY):
            with Locations(
                [
                    (x, y)
                    for x in (-HOLE_OFFSET_X, HOLE_OFFSET_X)
                    for y in (-HOLE_OFFSET_Y, HOLE_OFFSET_Y)
                ]
            ):
                Circle(HOLE_DIAMETER / 2)
        extrude(amount=HEIGHT_Z, mode=Mode.SUBTRACT)

    return block.part
