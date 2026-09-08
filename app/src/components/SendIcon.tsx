import Svg, { Path } from 'react-native-svg'
import { colors, layout } from '../design/tokens'

/**
 * ELLI mark used as the send control (fixes package task UI-02: the send button loses its
 * peach circle and becomes the logo itself, 40x40).
 *
 * The path is `ui/ELLI_Design_Fixes_Package/icons/icon_send.svg` inlined: the project has
 * react-native-svg but no svg transformer, so an .svg file cannot be imported directly.
 */
export function SendIcon({ size = layout.sendButton }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path
        d="M7,31C7,31 9.959,29.173 12.146,24.746C14.777,19.422 13.239,15.973 17.108,11.853C22.746,5.849 35.387,9.481 33.876,21.241C33.339,25.418 29.385,28.353 25.721,28.952C21.635,29.62 14.611,28.972 7.473,30.895L7,31Z"
        fill={colors.brand}
      />
    </Svg>
  )
}
