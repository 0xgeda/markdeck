import Foundation
import CoreGraphics
import ImageIO
let size=1024
let space=CGColorSpaceCreateDeviceRGB(),c=CGContext(data:nil,width:size,height:size,bitsPerComponent:8,bytesPerRow:size*4,space:CGColorSpaceCreateDeviceRGB(),bitmapInfo:CGImageAlphaInfo.premultipliedLast.rawValue)!
c.translateBy(x:0,y:1024);c.scaleBy(x:1,y:-1)
c.saveGState();c.addPath(CGPath(roundedRect:CGRect(x:80,y:80,width:864,height:864),cornerWidth:190,cornerHeight:190,transform:nil));c.clip()
let gradient=CGGradient(colorsSpace:space,colors:[CGColor(red:62/255,green:150/255,blue:101/255,alpha:1),CGColor(red:36/255,green:100/255,blue:68/255,alpha:1)] as CFArray,locations:[0,1])!
c.drawLinearGradient(gradient,start:CGPoint(x:512,y:80),end:CGPoint(x:512,y:944),options:[]);c.restoreGState()
let white=CGColor(red:243/255,green:250/255,blue:245/255,alpha:1)
func shape(_ points:[CGPoint]){let p=CGMutablePath();p.addLines(between:points);p.closeSubpath();c.addPath(p);c.fillPath()}
let letter=[CGPoint(x:280,y:744),CGPoint(x:280,y:280),CGPoint(x:370,y:280),CGPoint(x:512,y:498),CGPoint(x:654,y:280),CGPoint(x:744,y:280),CGPoint(x:744,y:744),CGPoint(x:652,y:744),CGPoint(x:652,y:446),CGPoint(x:512,y:650),CGPoint(x:372,y:446),CGPoint(x:372,y:744)]
c.setFillColor(white);c.setStrokeColor(white)

 shape(letter);c.setFillColor(CGColor(red:183/255,green:217/255,blue:194/255,alpha:1));shape([CGPoint(x:370,y:280),CGPoint(x:512,y:498),CGPoint(x:512,y:650),CGPoint(x:372,y:446)]);c.setFillColor(CGColor(red:221/255,green:239/255,blue:227/255,alpha:1));shape([CGPoint(x:654,y:280),CGPoint(x:652,y:446),CGPoint(x:512,y:650),CGPoint(x:512,y:498)])

let destination=CGImageDestinationCreateWithURL(URL(fileURLWithPath:CommandLine.arguments[1]) as CFURL,"public.png" as CFString,1,nil)!
CGImageDestinationAddImage(destination,c.makeImage()!,nil);if !CGImageDestinationFinalize(destination){fatalError("PNG encoding failed")}
